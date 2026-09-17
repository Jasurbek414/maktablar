package com.maktab.repository;

import com.maktab.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByStudentIdOrderByCreatedAtAsc(Long studentId);
    long countByStudentIdAndSenderTypeAndReadAtIsNull(Long studentId, Message.SenderType senderType);

    /** Bot boshqaruv paneli — bir nechta o'quvchi bo'yicha xabarlarni bitta ro'yxatga yig'ish uchun. */
    List<Message> findByStudentIdInOrderByCreatedAtDesc(List<Long> studentIds);
}
