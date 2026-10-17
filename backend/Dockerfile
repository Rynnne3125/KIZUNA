# Stage 1: Build JAR
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

COPY gradlew .
COPY gradle ./gradle
COPY build.gradle settings.gradle gradle.properties ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon

# Stage 2: Lightweight Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy JAR from build stage
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 3000

# Limit JVM heap to 512m to fit EC2 micro instances (1GB RAM)
ENTRYPOINT ["java", "-Xms256m", "-Xmx512m", "-jar", "app.jar"]
