package com.kizuna;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev")
class KizunaBackendApplicationTests {

    @Test
    void contextLoads() {
        // Verifies that the Spring Boot application context starts up cleanly
    }
}
