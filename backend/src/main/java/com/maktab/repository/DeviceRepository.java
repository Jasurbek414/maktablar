package com.maktab.repository;

import com.maktab.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByApiKey(String apiKey);
    Optional<Device> findByLogin(String login);
    List<Device> findBySchoolId(Long schoolId);
    List<Device> findBySchoolIdIn(List<Long> schoolIds);
    List<Device> findByStatus(Device.DeviceStatus status);
    List<Device> findByLastHeartbeatBefore(LocalDateTime time);
}
