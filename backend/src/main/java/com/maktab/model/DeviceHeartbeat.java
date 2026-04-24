package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "device_heartbeats")
public class DeviceHeartbeat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Column(nullable = false)
    private String deviceSerial;

    @Column
    private String deviceName;

    @Column
    private String ipAddress;

    @Column(nullable = false)
    private OffsetDateTime lastSeen;

    @Column
    private Boolean online;

    @Column
    private Integer pendingEvents; // events stored locally on mini-pc waiting to sync
}
