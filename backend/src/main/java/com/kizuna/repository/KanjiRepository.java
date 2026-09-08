package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.Kanji;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class KanjiRepository extends AbstractFirestoreRepository<Kanji> {

    public KanjiRepository(Firestore firestore) {
        super(firestore, "kanji", Kanji.class);
    }

    public List<Kanji> findByJlptLevel(String jlptLevel, int limit) {
        return executeQuery(getCollection()
                .whereEqualTo("jlptLevel", jlptLevel.toUpperCase())
                .limit(limit > 0 ? limit : 50));
    }
}
