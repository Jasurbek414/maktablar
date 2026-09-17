package com.maktab.repository;

import com.maktab.model.BroadcastLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BroadcastLogRepository extends JpaRepository<BroadcastLog, Long> {
    List<BroadcastLog> findAllByOrderByCreatedAtDesc();
    List<BroadcastLog> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
}
