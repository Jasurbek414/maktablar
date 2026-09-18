package com.maktab.repository;

import com.maktab.model.PersonLastSeen;
import com.maktab.model.PersonNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PersonLastSeenRepository extends JpaRepository<PersonLastSeen, Long> {
    Optional<PersonLastSeen> findByPersonTypeAndPersonId(PersonNote.PersonType personType, Long personId);
}
