package com.maktab.repository;

import com.maktab.model.MikrotikRouter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MikrotikRouterRepository extends JpaRepository<MikrotikRouter, Long> {
    Optional<MikrotikRouter> findByApiKey(String apiKey);
    Optional<MikrotikRouter> findBySchoolId(Long schoolId);
    List<MikrotikRouter> findBySchoolIdIn(List<Long> schoolIds);
    List<MikrotikRouter> findByStatus(MikrotikRouter.RouterStatus status);
    List<MikrotikRouter> findByLastHeartbeatBefore(LocalDateTime time);
}
