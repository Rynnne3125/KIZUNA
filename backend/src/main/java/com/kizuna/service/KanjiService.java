package com.kizuna.service;

import com.kizuna.dto.request.KanjiCreateRequest;
import com.kizuna.dto.response.KanjiResponse;

import java.util.List;

public interface KanjiService {

    List<KanjiResponse> getKanjiByJlpt(String level, int limit);

    KanjiResponse getKanjiById(String id);

    KanjiResponse createKanji(KanjiCreateRequest request);

    void deleteKanji(String id);
}
