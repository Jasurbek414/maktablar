package com.maktab.repository;

import com.maktab.model.School;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SchoolRepository extends JpaRepository<School, Long> {
    List<School> findByDistrictId(Long districtId);
    List<School> findByDistrictIdIn(List<Long> districtIds);
    long countByDistrictId(Long districtId);
}
