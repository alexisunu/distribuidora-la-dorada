# Etapa 1: compilar
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q clean package -DskipTests

# Etapa 2: ejecutar
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Limita la memoria de Java para planes gratuitos de 512 MB
ENV JAVA_TOOL_OPTIONS="-Xmx350m"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
