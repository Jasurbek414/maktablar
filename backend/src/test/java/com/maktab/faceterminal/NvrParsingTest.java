package com.maktab.faceterminal;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Hikvision NVR'ning /ISAPI/ContentMgmt/InputProxy/channels(/status) javob shakli.
class NvrParsingTest {

    static final String CHANNELS = """
        <?xml version="1.0" encoding="UTF-8"?>
        <InputProxyChannelList version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
          <InputProxyChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
            <id>1</id>
            <name>Kirish yo'lagi</name>
            <sourceInputPortDescriptor>
              <proxyProtocol>HIKVISION</proxyProtocol>
              <addressingFormatType>ipaddress</addressingFormatType>
              <ipAddress>192.168.254.2</ipAddress>
              <managePortNo>8000</managePortNo>
              <srcInputPort>1</srcInputPort>
              <userName>admin</userName>
            </sourceInputPortDescriptor>
          </InputProxyChannel>
          <InputProxyChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
            <id>12</id>
            <name>305-xona</name>
            <sourceInputPortDescriptor>
              <ipAddress>192.168.254.13</ipAddress>
            </sourceInputPortDescriptor>
          </InputProxyChannel>
        </InputProxyChannelList>
        """;

    static final String STATUS = """
        <InputProxyChannelStatusList version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
          <InputProxyChannelStatus version="2.0">
            <id>1</id>
            <sourceInputPortDescriptor><ipAddress>192.168.254.2</ipAddress></sourceInputPortDescriptor>
            <online>true</online>
          </InputProxyChannelStatus>
          <InputProxyChannelStatus version="2.0">
            <id>12</id>
            <online>false</online>
          </InputProxyChannelStatus>
        </InputProxyChannelStatusList>
        """;

    @Test
    void parsesChannelListWithoutConfusingTheListWrapper() {
        List<HikvisionIsapiClient.NvrChannel> ch = HikvisionIsapiClient.parseNvrChannels(CHANNELS);
        assertEquals(2, ch.size());
        assertEquals(1, ch.get(0).id());
        assertEquals("Kirish yo'lagi", ch.get(0).name());
        assertEquals("192.168.254.2", ch.get(0).ipAddress());
        assertEquals(12, ch.get(1).id());
        assertEquals("305-xona", ch.get(1).name());
    }

    @Test
    void parsesPerChannelOnlineStatus() {
        Map<Integer, Boolean> st = HikvisionIsapiClient.parseNvrChannelStatus(STATUS);
        assertEquals(Map.of(1, true, 12, false), st);
    }

    @Test
    void emptyOrGarbageGivesEmptyResult() {
        assertTrue(HikvisionIsapiClient.parseNvrChannels("").isEmpty());
        assertTrue(HikvisionIsapiClient.parseNvrChannels(null).isEmpty());
        assertTrue(HikvisionIsapiClient.parseNvrChannelStatus("<html>404</html>").isEmpty());
    }
}
