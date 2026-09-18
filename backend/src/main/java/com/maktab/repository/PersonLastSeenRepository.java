package com.maktab.repository;

import com.maktab.model.PersonLastSeen;
import com.maktab.model.PersonNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PersonLastSeenRepository extends JpaRepository<PersonLastSeen, Long> {
    Optional<PersonLastSeen> findByPersonTypeAndPersonId(PersonNote.PersonType personType, Long personId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PersonLastSeen p WHERE p.personType = :personType AND p.personId = :personId")
    int deleteByPerson(@Param("personType") PersonNote.PersonType personType, @Param("personId") Long personId);
}
