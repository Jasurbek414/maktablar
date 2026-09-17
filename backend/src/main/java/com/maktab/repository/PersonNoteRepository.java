package com.maktab.repository;

import com.maktab.model.PersonNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PersonNoteRepository extends JpaRepository<PersonNote, Long> {
    List<PersonNote> findByPersonTypeAndPersonIdOrderByCreatedAtDesc(PersonNote.PersonType personType, Long personId);
}
