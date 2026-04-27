package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * Platformadan Mini-PC ga yuboriladigan buyruqlar
 * Platforma → Backend (saqlaydi) → Mini-PC (polling) → Face ID Terminal
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "device_commands")
public class DeviceCommand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Qaysi Mini-PC ga */
    @Column(nullable = false)
    private Long deviceId;

    /** Buyruq turi: REBOOT, GET_STATUS, ADD_FACE, DELETE_FACE, OPEN_DOOR, SYNC_FACES */
    @Column(nullable = false)
    private String commandType;

    /** Qaysi terminalga (serialNumber yoki null = barcha terminallar) */
    @Column
    private String targetTerminal;

    /** Qo'shimcha parametrlar (JSON) — masalan studentId, faceUrl */
    @Column(columnDefinition = "TEXT")
    private String params;

    /** Holat: PENDING, EXECUTING, COMPLETED, FAILED */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommandStatus status = CommandStatus.PENDING;

    /** Natija xabari */
    @Column(columnDefinition = "TEXT")
    private String result;

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime executedAt;

    public enum CommandStatus {
        PENDING, EXECUTING, COMPLETED, FAILED
    }
}
