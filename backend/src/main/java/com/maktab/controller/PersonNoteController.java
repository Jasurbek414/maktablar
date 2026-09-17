package com.maktab.controller;

import com.maktab.model.PersonNote;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.PersonNoteRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.UserRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * O'quvchi/o'qituvchi haqida xodim tomonidan qo'lda yozilgan izohlar TARIXI —
 * bitta statik maydon EMAS, har biri sana/muallif bilan qo'shiladigan ro'yxat.
 * Append-only: tahrirlash/o'chirish endpointlari YO'Q (tarix o'zgarmas bo'lishi kerak).
 * AI EMAS — faqat inson (xodim) tomonidan yozilgan matn.
 */
@RestController
@RequestMapping("/api/notes")
public class PersonNoteController {

    @Autowired private PersonNoteRepository personNoteRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                   @RequestParam String personType,
                                   @RequestParam Long personId) {
        User caller = currentUserService.requireUser(authHeader);
        PersonNote.PersonType type = parseType(personType);
        Long schoolId = resolveSchoolId(type, personId);
        if (schoolId == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.note.not_found")));
        }
        currentUserService.assertCanAccessSchool(caller, schoolId);
        List<PersonNote> notes = personNoteRepository.findByPersonTypeAndPersonIdOrderByCreatedAtDesc(type, personId);
        return ResponseEntity.ok(notes.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        PersonNote.PersonType type = parseType(String.valueOf(body.get("personType")));
        Long personId = Long.valueOf(body.get("personId").toString());
        String text = body.get("text") != null ? body.get("text").toString().trim() : "";
        if (text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.note.text_required")));
        }
        Long schoolId = resolveSchoolId(type, personId);
        if (schoolId == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.note.not_found")));
        }
        currentUserService.assertCanAccessSchool(caller, schoolId);

        PersonNote note = new PersonNote();
        note.setPersonType(type);
        note.setPersonId(personId);
        note.setAuthorId(caller.getId());
        note.setAuthorName(caller.getFullName());
        note.setText(text);
        note.setCreatedAt(LocalDateTime.now());
        personNoteRepository.save(note);
        return ResponseEntity.ok(toMap(note));
    }

    private PersonNote.PersonType parseType(String raw) {
        try {
            return PersonNote.PersonType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, i18n.msg("error.request.invalid_data"));
        }
    }

    private Long resolveSchoolId(PersonNote.PersonType type, Long personId) {
        if (type == PersonNote.PersonType.STUDENT) {
            Student s = studentRepository.findById(personId).orElse(null);
            return s != null && s.getSchool() != null ? s.getSchool().getId() : null;
        }
        User u = userRepository.findById(personId).orElse(null);
        return u != null ? u.getSchoolId() : null;
    }

    private Map<String, Object> toMap(PersonNote n) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", n.getId());
        m.put("personType", n.getPersonType().name());
        m.put("personId", n.getPersonId());
        m.put("authorId", n.getAuthorId());
        m.put("authorName", n.getAuthorName());
        m.put("text", n.getText());
        m.put("createdAt", n.getCreatedAt());
        return m;
    }
}
