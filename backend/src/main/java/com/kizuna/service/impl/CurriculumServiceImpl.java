package com.kizuna.service.impl;

import com.kizuna.dto.request.GameplayConfigRequest;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.*;
import com.kizuna.repository.CurriculumRepository;
import com.kizuna.service.CurriculumService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CurriculumServiceImpl implements CurriculumService {

    private final CurriculumRepository curriculumRepository;

    public CurriculumServiceImpl(CurriculumRepository curriculumRepository) {
        this.curriculumRepository = curriculumRepository;
    }

    // --- STAGES ---
    @Override
    public List<Stage> getAllStages() {
        return curriculumRepository.getAllStages();
    }

    @Override
    public Stage getStageById(String id) {
        return curriculumRepository.getStageById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stage not found with id: " + id));
    }

    @Override
    public Stage createStage(Stage stage) {
        return curriculumRepository.saveStage(stage);
    }

    @Override
    public Stage updateStage(String id, Stage stage) {
        getStageById(id);
        stage.setId(id);
        return curriculumRepository.saveStage(stage);
    }

    @Override
    public void deleteStage(String id) {
        getStageById(id);
        curriculumRepository.deleteStage(id);
    }

    // --- MILESTONES ---
    @Override
    public List<Milestone> getAllMilestones() {
        return curriculumRepository.getAllMilestones();
    }

    @Override
    public List<Milestone> getMilestonesByStage(String stageId) {
        return curriculumRepository.getMilestonesByStageId(stageId);
    }

    @Override
    public Milestone getMilestoneById(String id) {
        return curriculumRepository.getMilestoneById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with id: " + id));
    }

    @Override
    public Milestone createMilestone(Milestone milestone) {
        return curriculumRepository.saveMilestone(milestone);
    }

    @Override
    public Milestone updateMilestone(String id, Milestone milestone) {
        getMilestoneById(id);
        milestone.setId(id);
        return curriculumRepository.saveMilestone(milestone);
    }

    @Override
    public void deleteMilestone(String id) {
        getMilestoneById(id);
        curriculumRepository.deleteMilestone(id);
    }

    @Override
    public Milestone updateMilestoneStatus(String id, boolean active) {
        Milestone milestone = getMilestoneById(id);
        milestone.setActive(active);
        return curriculumRepository.saveMilestone(milestone);
    }

    @Override
    public Milestone updateMilestoneGameplayConfig(String id, GameplayConfigRequest request) {
        Milestone milestone = getMilestoneById(id);
        if (request.getXpReward() != null) {
            milestone.setXpReward(request.getXpReward());
        }
        if (request.getActivePointsReward() != null) {
            milestone.setActivePointsReward(request.getActivePointsReward());
        }
        if (request.getPrerequisiteMilestoneId() != null) {
            milestone.setPrerequisiteMilestoneId(request.getPrerequisiteMilestoneId());
        }
        return curriculumRepository.saveMilestone(milestone);
    }

    // --- QUESTS ---
    @Override
    public List<MilestoneQuest> getQuestsByMilestone(String milestoneId) {
        return curriculumRepository.getQuestsByMilestoneId(milestoneId);
    }

    @Override
    public MilestoneQuest getQuestById(String id) {
        return curriculumRepository.getQuestById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quest not found with id: " + id));
    }

    @Override
    public MilestoneQuest createQuest(MilestoneQuest quest) {
        return curriculumRepository.saveQuest(quest);
    }

    @Override
    public MilestoneQuest updateQuest(String id, MilestoneQuest quest) {
        getQuestById(id);
        quest.setId(id);
        return curriculumRepository.saveQuest(quest);
    }

    @Override
    public void deleteQuest(String id) {
        getQuestById(id);
        curriculumRepository.deleteQuest(id);
    }

    // --- VOCABULARY ---
    @Override
    public List<VocabularyItem> getVocabularyByMilestone(String milestoneId) {
        return curriculumRepository.getVocabularyByMilestoneId(milestoneId);
    }

    @Override
    public List<VocabularyItem> getAllVocabulary() {
        return curriculumRepository.getAllVocabulary();
    }

    @Override
    public VocabularyItem getVocabularyById(String id) {
        return curriculumRepository.getVocabularyById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vocabulary item not found with id: " + id));
    }

    @Override
    public VocabularyItem createVocabulary(VocabularyItem item) {
        return curriculumRepository.saveVocabulary(item);
    }

    @Override
    public VocabularyItem updateVocabulary(String id, VocabularyItem item) {
        getVocabularyById(id);
        item.setId(id);
        return curriculumRepository.saveVocabulary(item);
    }

    @Override
    public void deleteVocabulary(String id) {
        getVocabularyById(id);
        curriculumRepository.deleteVocabulary(id);
    }

    // --- KANJI ---
    @Override
    public List<KanjiItem> getKanjiByMilestone(String milestoneId) {
        return curriculumRepository.getKanjiByMilestoneId(milestoneId);
    }

    @Override
    public List<KanjiItem> getAllKanji() {
        return curriculumRepository.getAllKanji();
    }

    @Override
    public KanjiItem getKanjiById(String id) {
        return curriculumRepository.getKanjiById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji item not found with id: " + id));
    }

    @Override
    public KanjiItem createKanji(KanjiItem item) {
        return curriculumRepository.saveKanji(item);
    }

    @Override
    public KanjiItem updateKanji(String id, KanjiItem item) {
        getKanjiById(id);
        item.setId(id);
        return curriculumRepository.saveKanji(item);
    }

    @Override
    public void deleteKanji(String id) {
        getKanjiById(id);
        curriculumRepository.deleteKanji(id);
    }

    // --- GRAMMAR ---
    @Override
    public List<GrammarItem> getGrammarByMilestone(String milestoneId) {
        return curriculumRepository.getGrammarByMilestoneId(milestoneId);
    }

    // --- WHITELIST ---
    @Override
    public Map<String, Object> getWhitelistByMilestone(String milestoneId) {
        Milestone milestone = getMilestoneById(milestoneId);
        List<VocabularyItem> vocabulary = getVocabularyByMilestone(milestoneId);
        List<KanjiItem> kanji = getKanjiByMilestone(milestoneId);
        List<GrammarItem> grammar = getGrammarByMilestone(milestoneId);

        Map<String, Object> whitelist = new HashMap<>();
        whitelist.put("milestoneId", milestone.getId());
        whitelist.put("milestoneTitle", milestone.getTitle());
        whitelist.put("nejUnit", milestone.getNejUnit());
        whitelist.put("vocabulary", vocabulary);
        whitelist.put("vocabularyCount", vocabulary.size());
        whitelist.put("kanji", kanji);
        whitelist.put("kanjiCount", kanji.size());
        whitelist.put("grammar", grammar);
        whitelist.put("grammarCount", grammar.size());
        return whitelist;
    }

    @Override
    public VocabularyItem addWhitelistItem(String milestoneId, VocabularyItem item) {
        getMilestoneById(milestoneId);
        item.setMilestoneId(milestoneId);
        return curriculumRepository.saveVocabulary(item);
    }
}
