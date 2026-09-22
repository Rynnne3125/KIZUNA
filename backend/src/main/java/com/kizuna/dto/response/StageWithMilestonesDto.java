package com.kizuna.dto.response;

import java.util.ArrayList;
import java.util.List;

public class StageWithMilestonesDto {
    private String id;
    private String title;
    private int orderIndex;
    private String description;
    private String themeColor;
    private List<MilestoneProgressDto> milestones = new ArrayList<>();

    public StageWithMilestonesDto() {}

    public StageWithMilestonesDto(String id, String title, int orderIndex, String description, String themeColor) {
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

    public List<MilestoneProgressDto> getMilestones() { return milestones; }
    public void setMilestones(List<MilestoneProgressDto> milestones) { this.milestones = milestones; }
}
