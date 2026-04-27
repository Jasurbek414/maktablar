package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "devices")
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String apiKey;

    @Column(nullable = false)
    private String deviceName;

    @Column
    private Long schoolId;

    @Column
    private String localIp;

    @Column
    private String macAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeviceStatus status = DeviceStatus.OFFLINE;

    @Column
    private LocalDateTime lastHeartbeat;

    @Column
    private LocalDateTime registeredAt;

    @Column
    private Integer faceTerminalCount = 0;

    public enum DeviceStatus {
        ONLINE, OFFLINE, ERROR
    }
}
