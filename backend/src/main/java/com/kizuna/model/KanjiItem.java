package com.kizuna.model;

import java.util.ArrayList;
import java.util.List;

public class KanjiItem {
    private String id;
    private String milestoneId;
    private int kanjiNumber;
    private String kanji;
    private int strokeCount;
    private String radicals;
    private String onyomi;
    private String kunyomi;
    private String sinoVietnamese;
    private String vietnameseMeaning;
    private String mnemonicStory;
    private List<Object> exampleCompounds = new ArrayList<>();

    public KanjiItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public int getKanjiNumber() { return kanjiNumber; }
    public void setKanjiNumber(int kanjiNumber) { this.kanjiNumber = kanjiNumber; }

    public String getKanji() { return kanji; }
    public void setKanji(String kanji) { this.kanji = kanji; }

    public int getStrokeCount() { return strokeCount; }
    public void setStrokeCount(int strokeCount) { this.strokeCount = strokeCount; }

    public String getRadicals() { return radicals; }
    public void setRadicals(String radicals) { this.radicals = radicals; }

    public String getOnyomi() { return onyomi; }
    public void setOnyomi(String onyomi) { this.onyomi = onyomi; }

    public String getKunyomi() { return kunyomi; }
    public void setKunyomi(String kunyomi) { this.kunyomi = kunyomi; }

    public String getSinoVietnamese() { return sinoVietnamese; }
    public void setSinoVietnamese(String sinoVietnamese) { this.sinoVietnamese = sinoVietnamese; }

    public String getVietnameseMeaning() { return vietnameseMeaning; }
    public void setVietnameseMeaning(String vietnameseMeaning) { this.vietnameseMeaning = vietnameseMeaning; }

    public String getMnemonicStory() { return mnemonicStory; }
    public void setMnemonicStory(String mnemonicStory) { this.mnemonicStory = mnemonicStory; }

    public List<Object> getExampleCompounds() { return exampleCompounds; }
    public void setExampleCompounds(List<Object> exampleCompounds) { this.exampleCompounds = exampleCompounds; }
}
