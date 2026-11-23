package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Stage {
    private String id;
    private String title;
    private int orderIndex;
    private String description;
    private String themeColor;
    private String jlptLevel = "N5";
    private List<String> colorGradient;

    public Stage() {}

    public Stage(String id, String title, int orderIndex, String description, String themeColor) {
        this.id = id;
        this.title = title;
        this.orderIndex = orderIndex;
        this.description = description;
        this.themeColor = themeColor;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getThemeColor() { return themeColor; }
    public void setThemeColor(String themeColor) { this.themeColor = themeColor; }

    public String getJlptLevel() { return jlptLevel; }
    public void setJlptLevel(String jlptLevel) { this.jlptLevel = jlptLevel; }

    public List<String> getColorGradient() { return colorGradient; }
    public void setColorGradient(List<String> colorGradient) { this.colorGradient = colorGradient; }
}
