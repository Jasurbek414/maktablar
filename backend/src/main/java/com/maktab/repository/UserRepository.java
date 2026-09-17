package com.maktab.repository;

import com.maktab.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByRole(User.Role role);
    List<User> findByRole(User.Role role);
    List<User> findByRoleAndSchoolId(User.Role role, Long schoolId);
    List<User> findByRoleAndSchoolIdIn(User.Role role, List<Long> schoolIds);
    List<User> findBySchoolId(Long schoolId);
    List<User> findBySchoolIdIn(List<Long> schoolIds);
    List<User> findByRoleAndProvinceId(User.Role role, Long provinceId);
    Optional<User> findFirstByRoleAndSchoolId(User.Role role, Long schoolId);
    Optional<User> findFirstByRoleAndProvinceId(User.Role role, Long provinceId);
}
