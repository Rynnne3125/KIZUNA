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
    private final Map<String, JlptExam> examsMap = new ConcurrentHashMap<>();

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
                        stage.setColorGradient(objectMapper.convertValue(node.get("colorGradient"), new TypeReference<>() {}));
                    } else {
                        stage.setThemeColor("#DC2626");
                    }
                    stage.setJlptLevel(node.path("jlptLevel").asText(node.path("jlpt_level").asText("N5")));
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
                        if (!List.of("id", "milestoneId", "stepIndex", "questType", "title", "description", "xpReward", "activePointsReward",
                                "srsCardIds", "srsCards", "quizQuestions", "scrambleSentences", "roleplayDialogues").contains(entry.getKey())) {
                            quest.setAdditionalData(entry.getKey(), objectMapper.convertValue(entry.getValue(), Object.class));
                        }
                    }
                    if (node.has("srsCardIds") && node.get("srsCardIds").isArray()) {
                        quest.setSrsCardIds(objectMapper.convertValue(node.get("srsCardIds"), new TypeReference<>() {}));
                    }
                    if (node.has("srsCards") && node.get("srsCards").isArray()) {
                        quest.setSrsCards(objectMapper.convertValue(node.get("srsCards"), new TypeReference<>() {}));
                    }
                    if (node.has("quizQuestions") && node.get("quizQuestions").isArray()) {
                        quest.setQuizQuestions(objectMapper.convertValue(node.get("quizQuestions"), new TypeReference<>() {}));
                    }
                    if (node.has("scrambleSentences") && node.get("scrambleSentences").isArray()) {
                        quest.setScrambleSentences(objectMapper.convertValue(node.get("scrambleSentences"), new TypeReference<>() {}));
                    }
                    if (node.has("roleplayDialogues") && node.get("roleplayDialogues").isArray()) {
                        quest.setRoleplayDialogues(objectMapper.convertValue(node.get("roleplayDialogues"), new TypeReference<>() {}));
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
                    vocab.setLevel(node.path("level").asText(node.path("jlptLevel").asText("N5")));
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
                    kanji.setLevel(node.path("level").asText(node.path("jlptLevel").asText("N5")));
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
                    grammar.setLevel(node.path("level").asText(node.path("jlptLevel").asText("N5")));
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
        deleteFromFirestore("milestone_quests", id);
        return removed != null;
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
    public List<GrammarItem> getAllGrammar() {
        return new ArrayList<>(grammarMap.values());
    }

    public List<GrammarItem> getGrammarByMilestoneId(String milestoneId) {
        return grammarMap.values().stream()
                .filter(g -> milestoneId.equalsIgnoreCase(g.getMilestoneId()))
                .collect(Collectors.toList());
    }

    public Optional<GrammarItem> getGrammarById(String id) {
        return Optional.ofNullable(grammarMap.get(id));
    }

    public GrammarItem saveGrammar(GrammarItem item) {
        if (item.getId() == null || item.getId().isBlank()) {
            item.setId("gram_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 4));
        }
        grammarMap.put(item.getId(), item);
        syncToFirestore("grammar_items", item.getId(), item);
        return item;
    }

    public boolean deleteGrammar(String id) {
        GrammarItem removed = grammarMap.remove(id);
        if (removed != null) {
            deleteFromFirestore("grammar_items", id);
            return true;
        }
        return false;
    }

    // --- EXAMS ---
    public List<JlptExam> getAllExams() {
        if (examsMap.isEmpty() && firestore != null) {
            try {
                var docs = firestore.collection("jlpt_exam_catalog").limit(200).get().get(2, java.util.concurrent.TimeUnit.SECONDS).getDocuments();
                for (var doc : docs) {
                    JlptExam exam = doc.toObject(JlptExam.class);
                    if (exam != null) {
                        if (exam.getId() == null || exam.getId().isBlank()) exam.setId(doc.getId());
                        examsMap.putIfAbsent(exam.getId(), exam);
                    }
                }
            } catch (Exception e) {
                logger.debug("Firestore exams load skipped: {}", e.getMessage());
            }
        }
        return new ArrayList<>(examsMap.values());
    }

    public Optional<JlptExam> getExamById(String id) {
        return Optional.ofNullable(examsMap.get(id));
    }

    public JlptExam saveExam(JlptExam exam) {
        if (exam.getId() == null || exam.getId().isBlank()) {
            exam.setId("ex_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 4));
        }
        examsMap.put(exam.getId(), exam);
        syncToFirestore("jlpt_exam_catalog", exam.getId(), exam);
        return exam;
    }

    public boolean deleteExam(String id) {
        JlptExam removed = examsMap.remove(id);
        if (removed != null) {
            deleteFromFirestore("jlpt_exam_catalog", id);
            return true;
        }
        return false;
    }

    // --- BULK SAVE & SEED RESTORE ---
    public List<VocabularyItem> bulkSaveVocabulary(List<VocabularyItem> items) {
        List<VocabularyItem> saved = new ArrayList<>();
        for (VocabularyItem item : items) {
            if (item == null || item.getTerm() == null || item.getTerm().isBlank()) continue;
            if (item.getId() == null || item.getId().isBlank()) {
                item.setId("vocab_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5));
            }
            saved.add(saveVocabulary(item));
        }
        return saved;
    }

    public List<KanjiItem> bulkSaveKanji(List<KanjiItem> items) {
        List<KanjiItem> saved = new ArrayList<>();
        for (KanjiItem item : items) {
            if (item == null || item.getKanji() == null || item.getKanji().isBlank()) continue;
            if (item.getId() == null || item.getId().isBlank()) {
                item.setId("kanji_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5));
            }
            saved.add(saveKanji(item));
        }
        return saved;
    }

    public synchronized Map<String, Object> restoreFromSeedData() {
        stagesMap.clear();
        milestonesMap.clear();
        questsMap.clear();
        vocabularyMap.clear();
        kanjiMap.clear();
        grammarMap.clear();
        loadSeedData();

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("stages", stagesMap.size());
        counts.put("milestones", milestonesMap.size());
        counts.put("quests", questsMap.size());
        counts.put("vocabulary", vocabularyMap.size());
        counts.put("kanji", kanjiMap.size());
        counts.put("grammar", grammarMap.size());
        return counts;
    }

    public Map<String, Object> exportBackupSnapshot() {
        Map<String, Object> backup = new LinkedHashMap<>();
        backup.put("exportedAt", java.time.Instant.now().toString());
        backup.put("counts", Map.of(
                "stages", stagesMap.size(),
                "milestones", milestonesMap.size(),
                "quests", questsMap.size(),
                "vocabulary", vocabularyMap.size(),
                "kanji", kanjiMap.size(),
                "grammar", grammarMap.size(),
                "exams", examsMap.size()
        ));
        backup.put("stages", getAllStages());
        backup.put("milestones", getAllMilestones());
        backup.put("vocabulary_items", getAllVocabulary());
        backup.put("kanji_dictionary", getAllKanji());
        backup.put("grammar_items", getAllGrammar());
        backup.put("jlpt_exam_catalog", getAllExams());
        return backup;
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
