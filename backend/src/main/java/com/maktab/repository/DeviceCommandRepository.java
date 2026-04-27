package com.maktab.repository;

import com.maktab.model.DeviceCommand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, Long> {
    List<DeviceCommand> findByDeviceIdAndStatus(Long deviceId, DeviceCommand.CommandStatus status);
    List<DeviceCommand> findByDeviceIdOrderByCreatedAtDesc(Long deviceId);
}
