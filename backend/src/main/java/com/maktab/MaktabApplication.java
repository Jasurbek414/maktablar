package com.maktab;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class MaktabApplication {
    public static void main(String[] args) {
        SpringApplication.run(MaktabApplication.class, args);
    }
}
