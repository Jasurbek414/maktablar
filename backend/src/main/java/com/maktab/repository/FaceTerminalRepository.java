package com.maktab.repository;

import com.maktab.model.FaceTerminal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaceTerminalRepository extends JpaRepository<FaceTerminal, Long> {
    List<FaceTerminal> findByDeviceId(Long deviceId);
    List<FaceTerminal> findByDeviceIdIn(List<Long> deviceIds);
    List<FaceTerminal> findByStatus(FaceTerminal.TerminalStatus status);
    long countByDeviceId(Long deviceId);
    long countByDeviceIdAndDirection(Long deviceId, FaceTerminal.Direction direction);
}
