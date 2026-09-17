package com.maktab.repository;

import com.maktab.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findBySchoolId(Long schoolId);
    List<Room> findBySchoolIdIn(List<Long> schoolIds);
    List<Room> findBySchoolIdOrderByNumberAsc(Long schoolId);
}
