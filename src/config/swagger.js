import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

let serverUrl;

if (process.env.NODE_ENV === "production") {
  const swaggerHost =
    process.env.SWAGGER_HOST || "itcareermatch.up.railway.app";
  const swaggerScheme = process.env.SWAGGER_SCHEME || "https";
  serverUrl = `${swaggerScheme}://${swaggerHost}`;
  console.log(`[Swagger] Production mode: ${serverUrl}`);
} else {
  const port = process.env.PORT || 3000;
  serverUrl = `http://localhost:${port}`;
  console.log(`[Swagger] Development mode: ${serverUrl}`);
}

const swaggerDefinition = {
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
    {
      url: `${serverUrl}/internal`,
      description: "Internal API",
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
      internalApiKey: {
        type: "apiKey",
        in: "header",
        name: "x-internal-request",
        description:
          "Internal service authentication header for backend-to-backend calls only. Do not use this from frontend or public clients.",
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication information is missing or invalid",
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
      BadRequestError: {
        description: "The request is invalid or missing required data",
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
                  example: "Bad Request",
                },
              },
            },
          },
        },
      },
      NotFoundError: {
        description: "The requested resource was not found",
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
                  example: "Not found",
                },
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
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
};

const options = {
  definition: swaggerDefinition,
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
