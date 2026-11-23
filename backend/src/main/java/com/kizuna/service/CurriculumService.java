package com.kizuna.service;

import com.kizuna.dto.request.GameplayConfigRequest;
import com.kizuna.model.*;

import java.util.List;
import java.util.Map;

public interface CurriculumService {
    // Stages
    List<Stage> getAllStages();
    Stage getStageById(String id);
    Stage createStage(Stage stage);
    Stage updateStage(String id, Stage stage);
    void deleteStage(String id);

    // Milestones
    List<Milestone> getAllMilestones();
    List<Milestone> getMilestonesByStage(String stageId);
    Milestone getMilestoneById(String id);
    Milestone createMilestone(Milestone milestone);
    Milestone updateMilestone(String id, Milestone milestone);
    void deleteMilestone(String id);
    Milestone updateMilestoneStatus(String id, boolean active);
    Milestone updateMilestoneGameplayConfig(String id, GameplayConfigRequest request);

    // Quests
    List<MilestoneQuest> getQuestsByMilestone(String milestoneId);
    MilestoneQuest getQuestById(String id);
    MilestoneQuest createQuest(MilestoneQuest quest);
    MilestoneQuest updateQuest(String id, MilestoneQuest quest);
    void deleteQuest(String id);

    // Vocabulary
    List<VocabularyItem> getVocabularyByMilestone(String milestoneId);
    List<VocabularyItem> getAllVocabulary();
    VocabularyItem getVocabularyById(String id);
    VocabularyItem createVocabulary(VocabularyItem item);
    VocabularyItem updateVocabulary(String id, VocabularyItem item);
    void deleteVocabulary(String id);
    List<VocabularyItem> bulkImportVocabulary(List<VocabularyItem> items);

    // Kanji
    List<KanjiItem> getKanjiByMilestone(String milestoneId);
    List<KanjiItem> getAllKanji();
    KanjiItem getKanjiById(String id);
    KanjiItem createKanji(KanjiItem item);
    KanjiItem updateKanji(String id, KanjiItem item);
    void deleteKanji(String id);
    List<KanjiItem> bulkImportKanji(List<KanjiItem> items);

    // Grammar
    List<GrammarItem> getAllGrammar();
    List<GrammarItem> getGrammarByMilestone(String milestoneId);
    GrammarItem getGrammarById(String id);
    GrammarItem createGrammar(GrammarItem item);
    GrammarItem updateGrammar(String id, GrammarItem item);
    void deleteGrammar(String id);

    // Exams
    List<JlptExam> getAllExams();
    JlptExam getExamById(String id);
    JlptExam createExam(JlptExam exam);
    JlptExam updateExam(String id, JlptExam exam);
    void deleteExam(String id);

    // Whitelist
    Map<String, Object> getWhitelistByMilestone(String milestoneId);
    VocabularyItem addWhitelistItem(String milestoneId, VocabularyItem item);

    // Backup & Restore
    Map<String, Object> exportBackup();
    Map<String, Object> restoreSeedData();
}
