package com.maktab.repository;

import com.maktab.model.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
    List<SchoolClass> findBySchoolId(Long schoolId);
    List<SchoolClass> findBySchoolIdIn(List<Long> schoolIds);
    List<SchoolClass> findBySchoolIdOrderByGradeAscSectionAsc(Long schoolId);

    /**
     * Sinf rahbari biriktirilgan sinflar — TEACHER rolidagi foydalanuvchi ko'lamini
     * aniqlash uchun (CurrentUserService#allowedClassIds). O'qituvchi bir nechta sinfga
     * rahbar bo'lishi mumkin, shuning uchun ro'yxat qaytaradi.
     */
    List<SchoolClass> findByTeacherId(Long teacherId);
}
