package com.maktab.repository;

import com.maktab.model.PersonNote;
import com.maktab.model.PersonRecognitionEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

public interface PersonRecognitionEventRepository extends JpaRepository<PersonRecognitionEvent, Long> {
    boolean existsBySyncKey(String syncKey);

    List<PersonRecognitionEvent> findByPersonTypeAndPersonIdOrderByOccurredAtDesc(PersonNote.PersonType personType, Long personId);

    // 7-bosqich (saqlash muddati) uchun oldindan tayyorlab qo'yiladi — retention job shu bilan ishlaydi.
    @Modifying
    @Transactional
    @Query("DELETE FROM PersonRecognitionEvent e WHERE e.occurredAt < :cutoff")
    int deleteByOccurredAtBefore(@Param("cutoff") OffsetDateTime cutoff);

    @Modifying
    @Transactional
    @Query("DELETE FROM PersonRecognitionEvent e WHERE e.personType = :personType AND e.personId = :personId")
    int deleteByPerson(@Param("personType") PersonNote.PersonType personType, @Param("personId") Long personId);
}
