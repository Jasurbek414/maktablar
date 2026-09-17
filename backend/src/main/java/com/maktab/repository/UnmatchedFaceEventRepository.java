package com.maktab.repository;

import com.maktab.model.UnmatchedFaceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UnmatchedFaceEventRepository extends JpaRepository<UnmatchedFaceEvent, Long> {
    List<UnmatchedFaceEvent> findTop50ByTerminalIdOrderByTimestampDesc(Long terminalId);
}
