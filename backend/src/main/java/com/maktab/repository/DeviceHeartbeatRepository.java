package com.maktab.repository;

import com.maktab.model.DeviceHeartbeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface DeviceHeartbeatRepository extends JpaRepository<DeviceHeartbeat, Long> {
    Optional<DeviceHeartbeat> findBySchoolIdAndDeviceSerial(Long schoolId, String serial);
    List<DeviceHeartbeat> findBySchoolId(Long schoolId);
}
