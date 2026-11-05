#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <vector>
#include <string>
#include <mutex>
#include <atomic>
#include <thread>
#include <chrono>
#include <fstream>
#include <deque>
#include <condition_variable>
#include <map>
#include <algorithm>

#include "HCISUPCMS.h"
#include "HCISUPStream.h"
#include "HCISUPPublic.h"
#include "httplib.h"

// ─── Globals ───
std::atomic<LONG> g_lUserID{-1};
std::string g_deviceID = "";
std::string g_deviceSerial = "";
std::mutex g_deviceMapMutex;      // ONLY protects g_connectedDevices and g_devLookup
std::mutex g_isapiExecutionMutex; // Serializes ISAPI pass-through calls so they don't corrupt SDK buffers

struct DeviceInfoRecord {
    LONG lUserID;
    std::string deviceID;
    std::string serial;
    time_t connectedAt;
};

std::map<LONG, DeviceInfoRecord> g_connectedDevices;
std::map<std::string, LONG> g_devLookup; // Key: deviceID, serial (lowercase & trimmed)

// Stream state
std::atomic<LONG> g_previewSessionID{-1};
std::atomic<int> g_activeStreamClients{0};
std::mutex g_streamMutex;
std::condition_variable g_streamCV;
std::deque<std::vector<uint8_t>> g_streamPackets;
std::atomic<uint64_t> g_totalStreamBytes{0};
std::atomic<uint32_t> g_streamPacketsCount{0};

// ─── Forward Declarations ───
bool StartStreamOnDevice();
void StopStreamOnDevice();

// ─── SMS Stream Callback ───
static int g_rtpSock = -1;
static struct sockaddr_in g_rtpDest;

void CALLBACK DataCB(LONG iPreviewHandle, NET_EHOME_PREVIEW_CB_MSG* pPreviewCBMsg, void* pUserData) {
    if (pPreviewCBMsg && pPreviewCBMsg->pRecvdata && pPreviewCBMsg->dwDataLen > 0) {
        if (g_rtpSock < 0) {
            g_rtpSock = socket(AF_INET, SOCK_DGRAM, 0);
            memset(&g_rtpDest, 0, sizeof(g_rtpDest));
            g_rtpDest.sin_family = AF_INET;
            g_rtpDest.sin_port = htons(5004);
            g_rtpDest.sin_addr.s_addr = inet_addr("127.0.0.1");
        }
        sendto(g_rtpSock, pPreviewCBMsg->pRecvdata, pPreviewCBMsg->dwDataLen, 0, (struct sockaddr*)&g_rtpDest, sizeof(g_rtpDest));
        std::vector<uint8_t> pkt((uint8_t*)pPreviewCBMsg->pRecvdata, (uint8_t*)pPreviewCBMsg->pRecvdata + pPreviewCBMsg->dwDataLen);
        {
            std::lock_guard<std::mutex> lock(g_streamMutex);
            if (g_streamPackets.size() > 60) {
                g_streamPackets.pop_front();
            }
            g_streamPackets.push_back(std::move(pkt));
            g_totalStreamBytes += pPreviewCBMsg->dwDataLen;
            g_streamPacketsCount++;
        }
        g_streamCV.notify_all();
    }
}

BOOL CALLBACK NewLinkCB(LONG lLinkHandle, NET_EHOME_NEWLINK_CB_MSG* pNewLinkCBMsg, void* pUserData) {
    printf("[STREAM NEW LINK] Handle=%ld, DeviceID=%s, SessionID=%ld, StreamType=%u\n",
           (long)lLinkHandle, pNewLinkCBMsg->szDeviceID, (long)pNewLinkCBMsg->iSessionID, pNewLinkCBMsg->byStreamType);
    pNewLinkCBMsg->fnPreviewDataCB = DataCB;
    pNewLinkCBMsg->byStreamFormat = 1; // 1-Standard stream (H.264)
    fflush(stdout);
    return TRUE;
}

// ─── CMS Register Callback ───
BOOL CALLBACK RegisterCB(LONG lUserID, DWORD dwDataType, void *pOutBuffer, DWORD dwOutLen, void *pInBuffer, DWORD dwInLen, void *pUser) {
    if (dwDataType == 3) { // ENUM_DEV_AUTH
        std::string devId = "";
        std::string serial = "";
        if (pOutBuffer && dwOutLen >= sizeof(NET_EHOME_DEV_REG_INFO_V12)) {
            NET_EHOME_DEV_REG_INFO_V12 *pDev = (NET_EHOME_DEV_REG_INFO_V12*)pOutBuffer;
            devId = (char*)pDev->struRegInfo.byDeviceID;
            serial = (char*)pDev->struRegInfo.sDeviceSerial;
            printf("[+] DevID='%s', Serial='%s'\n", devId.c_str(), serial.c_str());
        }

        const char *key = "Ecos2026";
        if (pInBuffer && dwInLen > 0) {
            memset(pInBuffer, 0, dwInLen);
            strncpy((char*)pInBuffer, key, dwInLen - 1);
        }
        fflush(stdout);
        return TRUE;
    } else if (dwDataType == 4) { // ENUM_DEV_SESSIONKEY
        NET_EHOME_DEV_REG_INFO_V12 *pDev = (NET_EHOME_DEV_REG_INFO_V12*)pOutBuffer;
        printf("[+] ENUM_DEV_SESSIONKEY: DevID=%s (KEY MATCHED!)\n", pDev->struRegInfo.byDeviceID);
        NET_EHOME_DEV_SESSIONKEY sk = {0};
        memcpy(sk.sDeviceID, pDev->struRegInfo.byDeviceID, sizeof(sk.sDeviceID));
        memcpy(sk.sSessionKey, pDev->struRegInfo.bySessionKey, sizeof(sk.sSessionKey));
        NET_ECMS_SetDeviceSessionKey(&sk);
        fflush(stdout);
        return TRUE;
    } else if (dwDataType == 5) { // ENUM_DEV_DAS_REQ
        const char *das = "{\"Type\":\"DAS\",\"DasInfo\":{\"Address\":\"62.169.27.106\",\"Domain\":\"\",\"ServerID\":\"\",\"Port\":7660}}";
        memset(pInBuffer, 0, dwInLen);
        strncpy((char*)pInBuffer, das, dwInLen - 1);
        fflush(stdout);
        return TRUE;
    } else if (dwDataType == 0) { // ENUM_DEV_ON
        auto *pDevInfo = (NET_EHOME_DEV_REG_INFO *)pOutBuffer;
        std::string devId = "";
        std::string serial = "";
        if (pDevInfo) {
            if (pDevInfo->byDeviceID[0]) devId = (char*)pDevInfo->byDeviceID;
            if (pDevInfo->sDeviceSerial[0]) serial = (char*)pDevInfo->sDeviceSerial;
        }

        {
            std::lock_guard<std::mutex> lock(g_deviceMapMutex);
            g_lUserID = lUserID;
            g_deviceID = devId;
            g_deviceSerial = serial;

            DeviceInfoRecord rec;
            rec.lUserID = lUserID;
            rec.deviceID = devId;
            rec.serial = serial;
            rec.connectedAt = time(nullptr);
            g_connectedDevices[lUserID] = rec;

            if (!devId.empty()) {
                g_devLookup[devId] = lUserID;
            }
            if (!serial.empty()) {
                g_devLookup[serial] = lUserID;
            }
        }

        printf("\n======================================================\n");
        printf(" [SUCCESS] >>> FACE ID IS ONLINE! lUserID=%ld <<<\n", (long)lUserID);
        printf(" Device ID: %s, Serial: %s\n", devId.c_str(), serial.c_str());
        printf("======================================================\n\n");
        
        auto *pServerInfo = (NET_EHOME_SERVER_INFO *)pInBuffer;
        if (pServerInfo) {
            pServerInfo->dwTimeOutCount = 6;
            pServerInfo->dwKeepAliveSec = 5;
        }
        fflush(stdout);
        return TRUE;
    } else if (dwDataType == 1) { // ENUM_DEV_OFF
        printf("[-] ENUM_DEV_OFF: Device disconnected: %ld\n", (long)lUserID);
        {
            std::lock_guard<std::mutex> lock(g_deviceMapMutex);
            if (g_connectedDevices.count(lUserID)) {
                auto rec = g_connectedDevices[lUserID];
                g_devLookup.erase(rec.deviceID);
                g_devLookup.erase(rec.serial);
                g_connectedDevices.erase(lUserID);
            }
            if (g_lUserID == lUserID) {
                g_lUserID = -1;
                g_previewSessionID = -1;
                // If other devices connected, fallback to latest
                if (!g_connectedDevices.empty()) {
                    g_lUserID = g_connectedDevices.rbegin()->first;
                }
            }
        }
        fflush(stdout);
        return TRUE;
    }
    return TRUE;
}

// ─── Stream Controls ───
bool StartStreamOnDevice() {
    LONG uid = g_lUserID.load();
    if (uid < 0) return false;

    if (g_previewSessionID.load() >= 0) {
        return true;
    }

    std::lock_guard<std::mutex> lock(g_streamMutex);
    if (g_previewSessionID.load() >= 0) return true;

    NET_EHOME_PREVIEWINFO_IN pin = {0};
    pin.iChannel = 1;
    pin.dwLinkMode = 0; // TCP
    pin.dwStreamType = 1; // 1-sub stream
    strcpy(pin.struStreamSever.szIP, "62.169.27.106");
    pin.struStreamSever.wPort = 7662;

    NET_EHOME_PREVIEWINFO_OUT pout = {0};
    BOOL bGet = NET_ECMS_StartGetRealStream(uid, &pin, &pout);
    printf("[+] NET_ECMS_StartGetRealStream: %d, SessionID=%ld, err=%d\n", bGet, (long)pout.lSessionID, NET_ECMS_GetLastError());

    if (bGet) {
        usleep(300000); // 300ms
        NET_EHOME_PUSHSTREAM_IN pushIn = {0};
        pushIn.dwSize = sizeof(pushIn);
        pushIn.lSessionID = pout.lSessionID;
        NET_EHOME_PUSHSTREAM_OUT pushOut = {0};
        pushOut.dwSize = sizeof(pushOut);
        BOOL bPush = NET_ECMS_StartPushRealStream(uid, &pushIn, &pushOut);
        printf("[+] NET_ECMS_StartPushRealStream: %d, err=%d\n", bPush, NET_ECMS_GetLastError());
        if (bPush) {
            g_previewSessionID = pout.lSessionID;
            return true;
        }
    }
    return false;
}

void StopStreamOnDevice() {
    LONG uid = g_lUserID.load();
    LONG sid = g_previewSessionID.load();
    if (uid >= 0 && sid >= 0) {
        std::lock_guard<std::mutex> lock(g_streamMutex);
        NET_EHOME_STOPSTREAM_PARAM stopParam = {0};
        stopParam.lSessionID = sid;
        NET_ECMS_StopGetRealStreamEx(uid, &stopParam);
        g_previewSessionID = -1;
        printf("[-] Stopped real stream session %ld\n", (long)sid);
    }
}
// ─── Execute ISAPI ───
bool ExecuteISAPI(const std::string &verb, const std::string &path, const std::string &inBody, const std::string &condBody, std::string &outBody, DWORD &errCode, LONG targetUid = -1) {
    LONG uid = targetUid;
    if (uid < 0) {
        uid = g_lUserID.load();
    }
    if (uid < 0) {
        errCode = 9999;
        outBody = "{\"error\":\"Device offline\"}";
        return false;
    }

    std::lock_guard<std::mutex> lock(g_isapiExecutionMutex);

    std::vector<char> outBuf(2 * 1024 * 1024, 0); // 2MB buffer
    NET_EHOME_PTXML_PARAM pt = {0};
    std::string fullUrl = path;
    pt.pRequestUrl = (void*)fullUrl.c_str();
    pt.dwRequestUrlLen = fullUrl.length();

    if (!condBody.empty()) {
        pt.pCondBuffer = (void*)condBody.c_str();
        pt.dwCondSize = condBody.length();
    }

    if (!inBody.empty()) {
        pt.pInBuffer = (void*)inBody.c_str();
        pt.dwInSize = inBody.length();
    }
    pt.pOutBuffer = outBuf.data();
    pt.dwOutSize = outBuf.size();
    pt.dwRecvTimeOut = 12000;

    BOOL ok = FALSE;
    if (verb == "GET") {
        ok = NET_ECMS_GetPTXMLConfig(uid, &pt);
        if (!ok) {
            std::string fallbackUrl = "GET " + path;
            pt.pRequestUrl = (void*)fallbackUrl.c_str();
            pt.dwRequestUrlLen = fallbackUrl.length();
            ok = NET_ECMS_ISAPIPassThrough(uid, &pt);
        }
    } else if (verb == "PUT") {
        ok = NET_ECMS_PutPTXMLConfig(uid, &pt);
        if (!ok) {
            std::string fallbackUrl = "PUT " + path;
            pt.pRequestUrl = (void*)fallbackUrl.c_str();
            pt.dwRequestUrlLen = fallbackUrl.length();
            ok = NET_ECMS_ISAPIPassThrough(uid, &pt);
        }
    } else if (verb == "POST") {
        ok = NET_ECMS_PostPTXMLConfig(uid, &pt);
        if (ok && outBuf[0] != '\0') {
            std::string tempResp(outBuf.data());
            if (tempResp.find("badJsonFormat") != std::string::npos && condBody.empty() && !inBody.empty()) {
                // Device expects search condition in pCondBuffer instead of pInBuffer!
                memset(outBuf.data(), 0, outBuf.size());
                NET_EHOME_PTXML_PARAM pt2 = {0};
                pt2.pRequestUrl = (void*)fullUrl.c_str();
                pt2.dwRequestUrlLen = fullUrl.length();
                pt2.pCondBuffer = (void*)inBody.c_str();
                pt2.dwCondSize = inBody.length();
                pt2.pOutBuffer = outBuf.data();
                pt2.dwOutSize = outBuf.size();
                pt2.dwRecvTimeOut = 12000;
                BOOL ok2 = NET_ECMS_PostPTXMLConfig(uid, &pt2);
                if (ok2 && outBuf[0] != '\0') {
                    std::string tempResp2(outBuf.data());
                    if (tempResp2.find("badJsonFormat") == std::string::npos) {
                        outBody = tempResp2;
                        return true;
                    }
                }
            }
        }
        if (!ok) {
            std::string fallbackUrl = "POST " + path;
            pt.pRequestUrl = (void*)fallbackUrl.c_str();
            pt.dwRequestUrlLen = fallbackUrl.length();
            ok = NET_ECMS_ISAPIPassThrough(uid, &pt);
        }
    } else if (verb == "DELETE") {
        ok = NET_ECMS_DeletePTXMLConfig(uid, &pt);
        if (!ok) {
            std::string fallbackUrl = "DELETE " + path;
            pt.pRequestUrl = (void*)fallbackUrl.c_str();
            pt.dwRequestUrlLen = fallbackUrl.length();
            ok = NET_ECMS_ISAPIPassThrough(uid, &pt);
        }
    }

    if (!ok) {
        errCode = NET_ECMS_GetLastError();
        printf("[-] ExecuteISAPI '%s %s' on uid %ld FAILED: ECMS Error = %u\n", verb.c_str(), path.c_str(), (long)uid, errCode);
        fflush(stdout);
        return false;
    }

    outBody = std::string(outBuf.data());
    return true;
}

// ─── Multipart Helper ───
void ParseMultipart(const std::string &body, std::string &metaJson, std::string &jpegData) {
    std::string boundary = "";
    size_t firstLineEnd = body.find("\r\n");
    if (firstLineEnd != std::string::npos && body.substr(0, 2) == "--") {
        boundary = body.substr(0, firstLineEnd);
    } else {
        size_t bPos = body.find("--");
        if (bPos != std::string::npos) {
            size_t bEnd = body.find("\r\n", bPos);
            if (bEnd != std::string::npos) {
                boundary = body.substr(bPos, bEnd - bPos);
            }
        }
    }

    if (boundary.empty()) {
        metaJson = body;
        return;
    }

    size_t cursor = 0;
    while ((cursor = body.find(boundary, cursor)) != std::string::npos) {
        cursor += boundary.length();
        if (body.substr(cursor, 2) == "--") break; // end of multipart
        if (body.substr(cursor, 2) == "\r\n") cursor += 2;

        size_t headerEnd = body.find("\r\n\r\n", cursor);
        if (headerEnd == std::string::npos) break;

        std::string headers = body.substr(cursor, headerEnd - cursor);
        size_t partStart = headerEnd + 4;

        size_t nextBoundary = body.find(boundary, partStart);
        if (nextBoundary == std::string::npos) break;

        size_t partEnd = nextBoundary;
        if (partEnd >= 2 && body.substr(partEnd - 2, 2) == "\r\n") {
            partEnd -= 2;
        }

        std::string partData = body.substr(partStart, partEnd - partStart);

        if (headers.find("application/json") != std::string::npos || headers.find("FaceDataRecord") != std::string::npos) {
            metaJson = partData;
        } else if (headers.find("image/jpeg") != std::string::npos || headers.find("FaceImage") != std::string::npos) {
            jpegData = partData;
        } else {
            if (partData.size() > 2 && (uint8_t)partData[0] == 0xFF && (uint8_t)partData[1] == 0xD8) {
                jpegData = partData;
            } else {
                metaJson = partData;
            }
        }
        cursor = nextBoundary;
    }
}

std::string ExtractFPID(const std::string &jsonStr) {
    size_t pos = jsonStr.find("\"FPID\":\"");
    if (pos != std::string::npos) {
        size_t start = pos + 8;
        size_t end = jsonStr.find("\"", start);
        if (end != std::string::npos) {
            return jsonStr.substr(start, end - start);
        }
    }
    pos = jsonStr.find("\"faceLibType\"");
    if (pos != std::string::npos) {
        pos = jsonStr.find("\"FPID\":\"", pos);
        if (pos != std::string::npos) {
            size_t start = pos + 8;
            size_t end = jsonStr.find("\"", start);
            if (end != std::string::npos) {
                return jsonStr.substr(start, end - start);
            }
        }
    }
    return "99999";
}

// ─── HTTP Server ───
void StartHttpServer() {
    httplib::Server svr;

    svr.set_keep_alive_max_count(1);
    svr.set_keep_alive_timeout(1);
    svr.set_read_timeout(5, 0);
    svr.set_write_timeout(5, 0);

    svr.set_mount_point("/static", "/opt/faceid_server/static");

    svr.Get("/devices", [](const httplib::Request &req, httplib::Response &res) {
        std::string json = "{\"devices\":[";
        {
            std::lock_guard<std::mutex> lock(g_deviceMapMutex);
            bool first = true;
            for (const auto &[uid, dev] : g_connectedDevices) {
                if (!first) json += ",";
                first = false;
                json += "{\"lUserID\":" + std::to_string(uid) + ",\"deviceID\":\"" + dev.deviceID + "\",\"serial\":\"" + dev.serial + "\"}";
            }
        }
        json += "]}";
        res.set_content(json, "application/json");
    });

    // ─── Generic ISAPI Handlers with target device lookup ───
    auto handleISAPI = [](const httplib::Request &req, httplib::Response &res, const std::string &verb) {
        std::string path = req.path;
        if (req.has_param("format")) {
            path += "?format=" + req.get_param_value("format");
        }

        LONG targetUid = -1;
        std::string targetDev = "";
        if (req.has_param("devId")) targetDev = req.get_param_value("devId");
        else if (req.has_param("devSerial")) targetDev = req.get_param_value("devSerial");
        else if (req.has_param("serial")) targetDev = req.get_param_value("serial");
        else if (req.has_header("X-Device-ID")) targetDev = req.get_header_value("X-Device-ID");
        else if (req.has_header("X-Device-Serial")) targetDev = req.get_header_value("X-Device-Serial");

        if (!targetDev.empty()) {
            std::lock_guard<std::mutex> lock(g_deviceMapMutex);
            if (g_devLookup.count(targetDev)) {
                targetUid = g_devLookup[targetDev];
            } else {
                for (const auto &[k, v] : g_devLookup) {
                    if (targetDev.find(k) != std::string::npos || k.find(targetDev) != std::string::npos) {
                        targetUid = v;
                        break;
                    }
                }
            }
        }

        std::string inBody = req.body;
        std::string condBody = "";

        // Check if httplib parsed multipart files/fields
        if (!req.form.files.empty() || !req.form.fields.empty()) {
            for (const auto &[key, field] : req.form.fields) {
                if (key == "FaceDataRecord" || field.content.find("faceLibType") != std::string::npos) {
                    condBody = field.content;
                } else if (field.content.size() > 2 && (uint8_t)field.content[0] == 0xFF && (uint8_t)field.content[1] == 0xD8) {
                    inBody = field.content;
                }
            }
            for (const auto &[key, file] : req.form.files) {
                if (key == "FaceDataRecord" || file.content.find("faceLibType") != std::string::npos) {
                    condBody = file.content;
                } else if (key == "img" || key == "faceImage" || (file.content.size() > 2 && (uint8_t)file.content[0] == 0xFF && (uint8_t)file.content[1] == 0xD8)) {
                    inBody = file.content;
                }
            }
            printf("[+] ISAPI Multipart parsed from req.form: condLen=%zu, inLen=%zu, uid=%ld\n",
                   condBody.size(), inBody.size(), (long)targetUid);
            fflush(stdout);
        } else if (!req.body.empty() && (req.body.find("boundary") != std::string::npos || req.body.substr(0, 2) == "--")) {
            std::string metaJson, jpegData;
            ParseMultipart(req.body, metaJson, jpegData);
            if (!metaJson.empty() || !jpegData.empty()) {
                condBody = metaJson;
                inBody = jpegData;
                printf("[+] ISAPI Multipart parsed from req.body: condLen=%zu, inLen=%zu, uid=%ld\n",
                       condBody.size(), inBody.size(), (long)targetUid);
                fflush(stdout);
            }
        }

        std::string out;
        DWORD err = 0;
        bool ok = ExecuteISAPI(verb, path, inBody, condBody, out, err, targetUid);
        if (ok) {
            std::string ct = "application/xml";
            if (!out.empty() && (out[0] == '{' || out[0] == '[')) {
                ct = "application/json";
            }
            res.set_content(out, ct);
        } else {
            res.status = 502;
            char errBuf[256];
            snprintf(errBuf, sizeof(errBuf), "{\"error\":\"ISAPI failed\",\"errorCode\":%u}", err);
            res.set_content(errBuf, "application/json");
        }
    };

    svr.Get(R"(/ISAPI/.*)", [handleISAPI](const httplib::Request &req, httplib::Response &res) {
        handleISAPI(req, res, "GET");
    });
    svr.Put(R"(/ISAPI/.*)", [handleISAPI](const httplib::Request &req, httplib::Response &res) {
        handleISAPI(req, res, "PUT");
    });
    svr.Post(R"(/ISAPI/.*)", [handleISAPI](const httplib::Request &req, httplib::Response &res) {
        handleISAPI(req, res, "POST");
    });
    svr.Delete(R"(/ISAPI/.*)", [handleISAPI](const httplib::Request &req, httplib::Response &res) {
        handleISAPI(req, res, "DELETE");
    });

    printf("[+] HTTP ISAPI Bridge listening on 0.0.0.0:8099...\n");
    fflush(stdout);
    svr.listen("0.0.0.0", 8099);
}

int main() {
    char libcrypto_path[] = "/opt/faceid_server/ehome_repo/thirdparty/HCISUPSDK/linux64/lib/libcrypto.so";
    char libssl_path[] = "/opt/faceid_server/ehome_repo/thirdparty/HCISUPSDK/linux64/lib/libssl.so";
    
    BOOL bCfg1 = NET_ECMS_SetSDKInitCfg(NET_EHOME_CMS_INIT_CFG_LIBEAY_PATH, libcrypto_path);
    BOOL bCfg2 = NET_ECMS_SetSDKInitCfg(NET_EHOME_CMS_INIT_CFG_SSLEAY_PATH, libssl_path);
    printf("[+] SetSDKInitCfg crypto: %d, ssl: %d\n", bCfg1, bCfg2);

    BOOL bInit = NET_ECMS_Init();
    printf("[+] NET_ECMS_Init: %d\n", bInit);

    BOOL bSmsInit = NET_ESTREAM_Init();
    printf("[+] NET_ESTREAM_Init: %d\n", bSmsInit);

    // SMS Stream Server on 7662
    NET_EHOME_LISTEN_PREVIEW_CFG lcfg = {0};
    strcpy(lcfg.struIPAdress.szIP, "0.0.0.0");
    lcfg.struIPAdress.wPort = 7662;
    lcfg.fnNewLinkCB = NewLinkCB;
    lcfg.byLinkMode = 0; // TCP
    LONG hSms = NET_ESTREAM_StartListenPreview(&lcfg);
    printf("[+] NET_ESTREAM_StartListenPreview on 7662: Handle = %ld\n", (long)hSms);

    BOOL bReq = TRUE;
    NET_ECMS_SetSDKLocalCfg(SESSIONKEY_REQ_MOD, &bReq);
    
    NET_EHOME_LOCAL_ACCESS_SECURITY sec = {0};
    sec.dwSize = sizeof(sec);
    sec.byAccessSecurity = 0;
    NET_ECMS_SetSDKLocalCfg(ACTIVE_ACCESS_SECURITY, &sec);

    NET_EHOME_SET_REREGISTER_MODE rereg = {0};
    rereg.dwSize = sizeof(rereg);
    rereg.dwReRegisterMode = 0;
    NET_ECMS_SetSDKLocalCfg(SET_REREGISTER_MODE, &rereg);

    NET_EHOME_SEND_PARAM sendp = {0};
    sendp.dwSize = sizeof(sendp);
    sendp.bySendTimes = 3;
    NET_ECMS_SetSDKLocalCfg(SEND_PARAM, &sendp);

    NET_EHOME_REGISTER_LISTEN_MODE lmode = {0};
    lmode.dwSize = sizeof(lmode);
    lmode.dwRegisterListenMode = REGISTER_LISTEN_MODE_ALL;
    NET_ECMS_SetSDKLocalCfg(REGISTER_LISTEN_MODE, &lmode);

    // CMS Server on 7660
    NET_EHOME_CMS_LISTEN_PARAM param = {0};
    strcpy(param.struAddress.szIP, "0.0.0.0");
    param.struAddress.wPort = 7660;
    param.fnCB = RegisterCB;
    param.dwKeepAliveSec = 5;
    param.dwTimeOutCount = 6;

    LONG h = NET_ECMS_StartListen(&param);
    printf("[+] NET_ECMS_StartListen started on port 7660! Handle = %d\n", (int)h);
    fflush(stdout);
    if (h < 0) {
        printf("[-] StartListen failed: %d\n", NET_ECMS_GetLastError());
        return 1;
    }

    // Launch HTTP server on port 8099 in background thread
    std::thread httpThread(StartHttpServer);
    httpThread.detach();

    while (1) {
        sleep(1);
    }

    NET_ESTREAM_StopListenPreview(hSms);
    NET_ECMS_StopListen(h);
    NET_ESTREAM_Fini();
    NET_ECMS_Fini();
    return 0;
}
