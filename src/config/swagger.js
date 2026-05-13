import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Dynamic server URL based on environment
const serverUrl = `${process.env.SWAGGER_SCHEME || "http"}://${
  process.env.SWAGGER_HOST || "localhost:3000"
}`;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ITCareerMatch API",
      version: "1.0.0",
      description:
        "ITCareerMatch API - AI-powered job recommendation platform that matches CV profiles with job opportunities based on skill analysis and career compatibility.",
      contact: {
        name: "ITCareerMatch Team",
      },
    },
    servers: [
      {
        url: serverUrl,
        description:
          process.env.NODE_ENV === "development"
            ? "Development Server"
            : "Production Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token without the 'Bearer ' prefix",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Missing or invalid authentication token",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Unauthorized",
                  },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Resource not found",
                  },
                },
              },
            },
          },
        },
        BadRequestError: {
          description: "Invalid request parameters",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Invalid request",
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Users",
        description: "User profile management",
      },
      {
        name: "CV",
        description: "CV upload, analysis, and status tracking",
      },
      {
        name: "Jobs",
        description: "Job listings and details",
      },
      {
        name: "Analysis",
        description: "AI analysis history and results",
      },
      {
        name: "Recommendations",
        description: "Personalized job recommendations",
      },
      {
        name: "Internal",
        description: "Internal backend endpoints (not for public use)",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
