package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.Vocabulary;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class VocabularyRepository extends AbstractFirestoreRepository<Vocabulary> {

    public VocabularyRepository(Firestore firestore) {
        super(firestore, "vocabularies", Vocabulary.class);
    }

    public List<Vocabulary> findByJlptLevel(String jlptLevel, int limit) {
        return executeQuery(getCollection()
                .whereEqualTo("jlptLevel", jlptLevel.toUpperCase())
                .limit(limit > 0 ? limit : 50));
    }

    public List<Vocabulary> findByLessonId(String lessonId) {
        return executeQuery(getCollection()
                .whereEqualTo("lessonId", lessonId));
    }
}
