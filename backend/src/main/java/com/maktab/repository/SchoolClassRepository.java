package com.maktab.repository;

import com.maktab.model.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
    List<SchoolClass> findBySchoolId(Long schoolId);
    List<SchoolClass> findBySchoolIdOrderByGradeAscSectionAsc(Long schoolId);
}
