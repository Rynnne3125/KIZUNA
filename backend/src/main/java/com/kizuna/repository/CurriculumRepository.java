package com.kizuna.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.Firestore;
import com.kizuna.model.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class CurriculumRepository {

    private static final Logger logger = LoggerFactory.getLogger(CurriculumRepository.class);

    private final ObjectMapper objectMapper;
    private final Firestore firestore;

    private final Map<String, Stage> stagesMap = new ConcurrentHashMap<>();
    private final Map<String, Milestone> milestonesMap = new ConcurrentHashMap<>();
    private final Map<String, MilestoneQuest> questsMap = new ConcurrentHashMap<>();
    private final Map<String, VocabularyItem> vocabularyMap = new ConcurrentHashMap<>();
    private final Map<String, KanjiItem> kanjiMap = new ConcurrentHashMap<>();
    private final Map<String, GrammarItem> grammarMap = new ConcurrentHashMap<>();

    public CurriculumRepository(ObjectMapper objectMapper, @Autowired(required = false) Firestore firestore) {
        this.objectMapper = objectMapper;
        this.firestore = firestore;
    }

    @PostConstruct
    public void init() {
        loadSeedData();
    }

    private void loadSeedData() {
        String[] potentialPaths = {
                "docs/KIZUNA_NEJ_SEED_DATA.json",
                "../docs/KIZUNA_NEJ_SEED_DATA.json",
                "d:/Documents/KIZUNA/docs/KIZUNA_NEJ_SEED_DATA.json"
        };

        File file = null;
        for (String path : potentialPaths) {
            File f = new File(path);
            if (f.exists() && f.isFile()) {
                file = f;
                break;
            }
        }

        if (file == null) {
            logger.warn("Master seed file KIZUNA_NEJ_SEED_DATA.json not found in search paths. Initializing with empty curriculum.");
            return;
        }

        try {
            logger.info("Loading master curriculum from: {}", file.getAbsolutePath());
            JsonNode root = objectMapper.readTree(file);

            // 1. Stages
            if (root.has("stages")) {
                for (JsonNode node : root.get("stages")) {
                    Stage stage = new Stage();
                    stage.setId(node.path("id").asText());
                    stage.setTitle(node.path("title").asText());
                    stage.setOrderIndex(node.path("orderIndex").asInt());
                    stage.setDescription(node.path("description").asText());
                    if (node.has("colorGradient") && node.get("colorGradient").isArray() && node.get("colorGradient").size() > 0) {
                        stage.setThemeColor(node.get("colorGradient").get(0).asText());
                    } else {
                        stage.setThemeColor("#DC2626");
                    }
                    stagesMap.put(stage.getId(), stage);
                }
                logger.info("Loaded {} stages into memory.", stagesMap.size());
            }

            // 2. Milestones
            if (root.has("milestones")) {
                for (JsonNode node : root.get("milestones")) {
                    Milestone milestone = new Milestone();
                    milestone.setId(node.path("id").asText());
                    milestone.setStageId(node.path("stageId").asText());
                    milestone.setTitle(node.path("title").asText());
                    milestone.setNejUnit(node.path("nejUnit").asText());
                    milestone.setOrderIndex(node.path("orderIndex").asInt());
                    milestone.setCommunicationContext(node.path("communicationContext").asText());
                    milestone.setXpReward(node.path("xpReward").asInt(50));
                    milestone.setActivePointsReward(node.path("activePointsReward").asInt(70));
                    milestone.setPrerequisiteMilestoneId(node.path("prerequisiteMilestoneId").asText(null));
                    milestone.setActive(node.path("isActive").asBoolean(true));
                    milestonesMap.put(milestone.getId(), milestone);
                }
                logger.info("Loaded {} milestones into memory.", milestonesMap.size());
            }

            // 3. Milestone Quests
            if (root.has("milestone_quests")) {
                for (JsonNode node : root.get("milestone_quests")) {
                    MilestoneQuest quest = new MilestoneQuest();
                    quest.setId(node.path("id").asText());
                    quest.setMilestoneId(node.path("milestoneId").asText());
                    quest.setStepIndex(node.path("stepIndex").asInt());
                    quest.setQuestType(node.path("questType").asText());
                    quest.setTitle(node.path("title").asText());
                    quest.setDescription(node.path("description").asText());
                    quest.setXpReward(node.path("xpReward").asInt(50));
                    quest.setActivePointsReward(node.path("activePointsReward").asInt(25));

                    // Store other fields into additionalData
                    Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
                    while (fields.hasNext()) {
                        Map.Entry<String, JsonNode> entry = fields.next();
                        if (!List.of("id", "milestoneId", "stepIndex", "questType", "title", "description", "xpReward", "activePointsReward").contains(entry.getKey())) {
                            quest.setAdditionalData(entry.getKey(), objectMapper.convertValue(entry.getValue(), Object.class));
                        }
                    }
                    questsMap.put(quest.getId(), quest);
                }
                logger.info("Loaded {} quests into memory.", questsMap.size());
            }

            // 4. Vocabulary
            if (root.has("vocabulary_items")) {
                for (JsonNode node : root.get("vocabulary_items")) {
                    VocabularyItem vocab = new VocabularyItem();
                    vocab.setId(node.path("id").asText());
                    vocab.setMilestoneId(node.path("milestoneId").asText());
                    vocab.setTerm(node.path("term").asText());
                    vocab.setReading(node.path("reading").asText());
                    vocab.setSinoVietnamese(node.path("sinoVietnamese").asText());
                    vocab.setVietnameseMeaning(node.path("vietnameseMeaning").asText());
                    vocab.setWordType(node.path("wordType").asText());
                    vocab.setExampleSentenceJp(node.path("exampleSentenceJp").asText());
                    vocab.setExampleSentenceVi(node.path("exampleSentenceVi").asText());
                    vocab.setNejSource(node.path("nejSource").asText());
                    vocabularyMap.put(vocab.getId(), vocab);
                }
                logger.info("Loaded {} vocabulary items into memory.", vocabularyMap.size());
            }

            // 5. Kanji
            if (root.has("kanji_dictionary")) {
                for (JsonNode node : root.get("kanji_dictionary")) {
                    KanjiItem kanji = new KanjiItem();
                    kanji.setId(node.path("id").asText());
                    kanji.setMilestoneId(node.path("milestoneId").asText());
                    kanji.setKanjiNumber(node.path("kanjiNumber").asInt());
                    kanji.setKanji(node.path("kanji").asText());
                    kanji.setStrokeCount(node.path("strokeCount").asInt());
                    kanji.setRadicals(node.path("radicals").asText());
                    kanji.setOnyomi(node.path("onyomi").asText());
                    kanji.setKunyomi(node.path("kunyomi").asText());
                    kanji.setSinoVietnamese(node.path("sinoVietnamese").asText());
                    kanji.setVietnameseMeaning(node.path("vietnameseMeaning").asText());
                    kanji.setMnemonicStory(node.path("mnemonicStory").asText());
                    if (node.has("exampleCompounds") && node.get("exampleCompounds").isArray()) {
                        kanji.setExampleCompounds(objectMapper.convertValue(node.get("exampleCompounds"), new TypeReference<>() {}));
                    }
                    kanjiMap.put(kanji.getId(), kanji);
                }
                logger.info("Loaded {} kanji items into memory.", kanjiMap.size());
            }

            // 6. Grammar
            if (root.has("grammar_items")) {
                for (JsonNode node : root.get("grammar_items")) {
                    GrammarItem grammar = new GrammarItem();
                    grammar.setId(node.path("id").asText());
                    grammar.setMilestoneId(node.path("milestoneId").asText());
                    grammar.setPattern(node.path("pattern").asText());
                    grammar.setTitleVi(node.path("titleVi").asText());
                    grammar.setExplanation(node.path("explanation").asText());
                    grammar.setNuanceReason(node.path("nuanceReason").asText());
                    grammar.setMasterExampleJp(node.path("masterExampleJp").asText());
                    grammar.setMasterExampleVi(node.path("masterExampleVi").asText());
                    if (node.has("scrambledTest")) {
                        grammar.setScrambledTest(objectMapper.convertValue(node.get("scrambledTest"), new TypeReference<>() {}));
                    }
                    grammarMap.put(grammar.getId(), grammar);
                }
                logger.info("Loaded {} grammar items into memory.", grammarMap.size());
            }

        } catch (Exception e) {
            logger.error("Error loading seed data into memory: {}", e.getMessage(), e);
        }
    }

    // --- STAGES ---
    public List<Stage> getAllStages() {
        return stagesMap.values().stream()
                .sorted(Comparator.comparingInt(Stage::getOrderIndex))
                .collect(Collectors.toList());
    }

    public Optional<Stage> getStageById(String id) {
        return Optional.ofNullable(stagesMap.get(id));
    }

    public Stage saveStage(Stage stage) {
        if (stage.getId() == null || stage.getId().isBlank()) {
            stage.setId("stage_" + System.currentTimeMillis());
        }
        stagesMap.put(stage.getId(), stage);
        syncToFirestore("stages", stage.getId(), stage);
        return stage;
    }

    public boolean deleteStage(String id) {
        Stage removed = stagesMap.remove(id);
        if (removed != null) {
            deleteFromFirestore("stages", id);
            return true;
        }
        return false;
    }

    // --- MILESTONES ---
    public List<Milestone> getAllMilestones() {
        return milestonesMap.values().stream()
                .sorted(Comparator.comparingInt(Milestone::getOrderIndex))
                .collect(Collectors.toList());
    }

    public List<Milestone> getMilestonesByStageId(String stageId) {
        return milestonesMap.values().stream()
                .filter(m -> stageId.equalsIgnoreCase(m.getStageId()))
                .sorted(Comparator.comparingInt(Milestone::getOrderIndex))
                .collect(Collectors.toList());
    }

    public Optional<Milestone> getMilestoneById(String id) {
        return Optional.ofNullable(milestonesMap.get(id));
    }

    public Milestone saveMilestone(Milestone milestone) {
        if (milestone.getId() == null || milestone.getId().isBlank()) {
            milestone.setId("milestone_" + System.currentTimeMillis());
        }
        milestonesMap.put(milestone.getId(), milestone);
        syncToFirestore("milestones", milestone.getId(), milestone);
        return milestone;
    }

    public boolean deleteMilestone(String id) {
        Milestone removed = milestonesMap.remove(id);
        if (removed != null) {
            deleteFromFirestore("milestones", id);
            return true;
        }
        return false;
    }

    // --- QUESTS ---
    public List<MilestoneQuest> getQuestsByMilestoneId(String milestoneId) {
        return questsMap.values().stream()
                .filter(q -> milestoneId.equalsIgnoreCase(q.getMilestoneId()))
                .sorted(Comparator.comparingInt(MilestoneQuest::getStepIndex))
                .collect(Collectors.toList());
    }

    public Optional<MilestoneQuest> getQuestById(String id) {
        return Optional.ofNullable(questsMap.get(id));
    }

    public Optional<MilestoneQuest> getQuestByMilestoneAndIndex(String milestoneId, int stepIndex) {
        return questsMap.values().stream()
                .filter(q -> milestoneId.equalsIgnoreCase(q.getMilestoneId()) && q.getStepIndex() == stepIndex)
                .findFirst();
    }

    public MilestoneQuest saveQuest(MilestoneQuest quest) {
        if (quest.getId() == null || quest.getId().isBlank()) {
            quest.setId("quest_" + System.currentTimeMillis());
        }
        questsMap.put(quest.getId(), quest);
        syncToFirestore("milestone_quests", quest.getId(), quest);
        return quest;
    }

    public boolean deleteQuest(String id) {
        MilestoneQuest removed = questsMap.remove(id);
        if (removed != null) {
            deleteFromFirestore("milestone_quests", id);
            return true;
        }
        return false;
    }

    // --- VOCABULARY ---
    public List<VocabularyItem> getVocabularyByMilestoneId(String milestoneId) {
        return vocabularyMap.values().stream()
                .filter(v -> milestoneId.equalsIgnoreCase(v.getMilestoneId()))
                .collect(Collectors.toList());
    }

    public List<VocabularyItem> getAllVocabulary() {
        return new ArrayList<>(vocabularyMap.values());
    }

    public Optional<VocabularyItem> getVocabularyById(String id) {
        return Optional.ofNullable(vocabularyMap.get(id));
    }

    public VocabularyItem saveVocabulary(VocabularyItem item) {
        if (item.getId() == null || item.getId().isBlank()) {
            item.setId("vocab_" + System.currentTimeMillis());
        }
        vocabularyMap.put(item.getId(), item);
        syncToFirestore("vocabulary_items", item.getId(), item);
        return item;
    }

    public boolean deleteVocabulary(String id) {
        VocabularyItem removed = vocabularyMap.remove(id);
        if (removed != null) {
            deleteFromFirestore("vocabulary_items", id);
            return true;
        }
        return false;
    }

    // --- KANJI ---
    public List<KanjiItem> getKanjiByMilestoneId(String milestoneId) {
        return kanjiMap.values().stream()
                .filter(k -> milestoneId.equalsIgnoreCase(k.getMilestoneId()))
                .sorted(Comparator.comparingInt(KanjiItem::getKanjiNumber))
                .collect(Collectors.toList());
    }

    public List<KanjiItem> getAllKanji() {
        return kanjiMap.values().stream()
                .sorted(Comparator.comparingInt(KanjiItem::getKanjiNumber))
                .collect(Collectors.toList());
    }

    public Optional<KanjiItem> getKanjiById(String id) {
        return Optional.ofNullable(kanjiMap.get(id));
    }

    public KanjiItem saveKanji(KanjiItem item) {
        if (item.getId() == null || item.getId().isBlank()) {
            item.setId("kanji_" + System.currentTimeMillis());
        }
        kanjiMap.put(item.getId(), item);
        syncToFirestore("kanji_dictionary", item.getId(), item);
        return item;
    }

    public boolean deleteKanji(String id) {
        KanjiItem removed = kanjiMap.remove(id);
        if (removed != null) {
            deleteFromFirestore("kanji_dictionary", id);
            return true;
        }
        return false;
    }

    // --- GRAMMAR ---
    public List<GrammarItem> getGrammarByMilestoneId(String milestoneId) {
        return grammarMap.values().stream()
                .filter(g -> milestoneId.equalsIgnoreCase(g.getMilestoneId()))
                .collect(Collectors.toList());
    }

    // Helper to asynchronously sync to Firestore if client is active
    private void syncToFirestore(String collection, String docId, Object entity) {
        if (firestore != null) {
            try {
                firestore.collection(collection).document(docId).set(entity);
            } catch (Exception e) {
                logger.debug("Firestore sync skipped or error (non-fatal): {}", e.getMessage());
            }
        }
    }

    private void deleteFromFirestore(String collection, String docId) {
        if (firestore != null) {
            try {
                firestore.collection(collection).document(docId).delete();
            } catch (Exception e) {
                logger.debug("Firestore delete skipped or error (non-fatal): {}", e.getMessage());
            }
        }
    }
}
