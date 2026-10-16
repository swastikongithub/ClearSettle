package com.clearsettle;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** ClearSettle backend entry point. Spring Boot owns OIDC authentication and server-side sessions. */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ClearSettleApplication {

	public static void main(String[] args) {
		SpringApplication.run(ClearSettleApplication.class, args);
	}
}
