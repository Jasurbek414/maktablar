package com.maktab.devices;

import com.maktab.faceterminal.HikvisionIsapiClient;
import com.maktab.faceterminal.TerminalEndpointResolver;
import com.maktab.faceterminal.TerminalException;
import com.maktab.model.Camera;
import com.maktab.repository.CameraRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CameraMonitorNvrTest {

    private CameraMonitor monitor;
    private CameraRepository repo;
    private TerminalEndpointResolver resolver;
    private HikvisionIsapiClient nvr;

    @BeforeEach
    void setUp() {
        monitor = new CameraMonitor();
        repo = mock(CameraRepository.class);
        resolver = mock(TerminalEndpointResolver.class);
        nvr = mock(HikvisionIsapiClient.class);
        ReflectionTestUtils.setField(monitor, "cameraRepo", repo);
        ReflectionTestUtils.setField(monitor, "resolver", resolver);
        when(resolver.hikvision(any(Camera.class))).thenReturn(nvr);
        when(resolver.baseUrl(any(Camera.class))).thenReturn("https://10.30.2.10:443");
    }

    private static Camera nvrCam(long id, int channel) {
        Camera c = new Camera();
        c.setId(id);
        c.setBrand("Hikvision");
        c.setIpAddress("192.168.88.10");
        c.setDeviceUsername("admin");
        c.setDevicePassword("secret");
        c.setNvrChannel(channel);
        c.setModel("DS-2CD2143");
        c.setStatus(Camera.CameraStatus.ONLINE);
        return c;
    }

    @Test
    void disconnectedCameraOnWorkingNvrIsReportedPerChannel() {
        Camera ok = nvrCam(1, 1);
        Camera cut = nvrCam(2, 2);
        Camera missing = nvrCam(3, 9);
        when(repo.findAll()).thenReturn(List.of(ok, cut, missing));
        when(nvr.nvrChannelOnline()).thenReturn(Map.of(1, true, 2, false));

        monitor.refreshAll();

        // NVR'ning modeli emas, kameraning o'z modeli saqlanadi
        verify(repo).markOnline(eq(1L), eq(Camera.CameraStatus.ONLINE), any(), eq("DS-2CD2143"), any(), any());
        verify(repo).markError(eq(2L), any(), contains("2-kanal oflayn"));
        verify(repo).markError(eq(3L), any(), contains("9-kanal topilmadi"));
        verify(repo, never()).markOnline(eq(2L), any(), any(), any(), any(), any());
        verify(nvr, times(1)).nvrChannelOnline(); // bitta NVR -> bitta so'rov
        verify(nvr, never()).deviceInfo();
    }

    @Test
    void unreachableNvrMarksAllItsCamerasWithTheError() {
        Camera a = nvrCam(1, 1);
        Camera b = nvrCam(2, 2);
        when(repo.findAll()).thenReturn(List.of(a, b));
        when(nvr.nvrChannelOnline()).thenThrow(new TerminalException("Terminal javob bermadi"));

        monitor.refreshAll();

        verify(repo).markError(eq(1L), any(), contains("javob bermadi"));
        verify(repo).markError(eq(2L), any(), contains("javob bermadi"));
        verify(repo, never()).markOnline(any(), any(), any(), any(), any(), any());
    }

    @Test
    void manualCheckOfOfflineChannelFailsEvenIfNvrAnswers() {
        Camera cut = nvrCam(2, 2);
        when(nvr.deviceInfo()).thenReturn(new HikvisionIsapiClient.DeviceInfo("NVR", "DS-7616NI", "SN", "mac", "V4", "NVR"));
        when(nvr.nvrChannelOnline()).thenReturn(Map.of(2, false));

        assertThrows(TerminalException.class, () -> monitor.refresh(cut));
        verify(repo, never()).markOnline(any(), any(), any(), any(), any(), any());
    }

    @Test
    void standaloneCameraStillUsesItsOwnDeviceInfo() {
        Camera cam = nvrCam(5, 1);
        cam.setNvrChannel(null);
        when(repo.findAll()).thenReturn(List.of(cam));
        when(nvr.deviceInfo()).thenReturn(new HikvisionIsapiClient.DeviceInfo("cam", "DS-2CD1", "SN1", "mac", "V5", "IPCamera"));

        monitor.refreshAll();

        verify(repo).markOnline(eq(5L), eq(Camera.CameraStatus.ONLINE), any(), eq("DS-2CD1"), eq("SN1"), eq("V5"));
        verify(nvr, never()).nvrChannelOnline();
    }
}
