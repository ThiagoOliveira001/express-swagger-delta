import color from "cli-color";
import * as SwaggerUi from "swagger-ui-express";
import express, { Express, Router } from "express";

import {
  IServer,
  ISwaggerProps,
  ISpecification,
  IInformation,
  IServerConfig,
  IAnyObject,
  IBaseRoute,
  IFormatRoute,
} from "./interfaces";

class FormatRoute implements IFormatRoute {
  express: string;
  swagger: string;

  constructor(route: string) {
    this.express = route;
    this.swagger = route;
  }
}

class AnyObject implements IAnyObject {
  [key: string]: object;
}

class ServerConfig implements IServerConfig {
  url: string;

  constructor() {
    this.url = "";
  }
}

class Information implements IInformation {
  name: string;
  title: string;
  version: string;
  description: string;

  constructor() {
    this.name = "";
    this.title = "";
    this.version = "";
    this.description = "";
  }
}

class Layout implements SwaggerUi.SwaggerUiOptions {}

class Specification implements ISpecification {
  openapi: string;
  info: IInformation;
  servers: IServerConfig[];
  components: IAnyObject;
  paths: IAnyObject;

  constructor() {
    this.openapi = "3.0.0";
    this.info = new Information();
    this.servers = [];
    this.components = new AnyObject();
    this.paths = new AnyObject();
  }
}

class SwaggerProps implements ISwaggerProps {
  layout: SwaggerUi.SwaggerUiOptions;
  specification: ISpecification;

  constructor() {
    this.layout = new Layout();
    this.specification = new Specification();
  }
}

class Server implements IServer {
  NODE_ENV: string;
  BASE_HOST: string;
  BASE_PATH: string;
  PORT: number;

  app: Express;
  router: Router;
  swaggerProps: ISwaggerProps;

  middleware: (req: any, res: any, callback: Function) => Function;

  constructor() {
    this.NODE_ENV = "";
    this.BASE_HOST = "";
    this.BASE_PATH = "";
    this.PORT = 0;

    this.app = express();
    this.router = express.Router();
    this.middleware = (req, res, callback) => callback(req, res);

    this.swaggerProps = new SwaggerProps();

    this.router.route("/").get((req, res) =>
      res.status(200).json({
        StatusCode: 200,
        Message: `${this.swaggerProps.specification.info.name.toUpperCase()}: OK! - process.env.NODE_ENV: ${
          this.NODE_ENV
        }`,
      })
    );
  }

  addRoute(route: IBaseRoute): void {
    const serverMiddleware = this.middleware;

    const formatedRoute = this._formatRoute(route.path.toString());

    if (route.method === "GET") {
      this.router.route(formatedRoute.express).get(function (req, res) {
        serverMiddleware(req, res, route.handler);
      });
    } else if (route.method === "POST") {
      this.router.route(formatedRoute.express).post(function (req, res) {
        serverMiddleware(req, res, route.handler);
      });
    } else if (route.method === "PUT") {
      this.router.route(formatedRoute.express).put(function (req, res) {
        serverMiddleware(req, res, route.handler);
      });
    } else if (route.method === "DELETE") {
      this.router.route(formatedRoute.express).delete(function (req, res) {
        serverMiddleware(req, res, route.handler);
      });
    }

    let routeConfig = {
      tags: route.tags,
      summary: route.summary,
      responses: route.responses,
    };

    if (route.security)
      Object.assign(routeConfig, {
        security: route.security,
      });

    if (route.parameters)
      Object.assign(routeConfig, {
        parameters: route.parameters,
      });

    if (route.requestBody)
      Object.assign(routeConfig, {
        requestBody: route.requestBody,
      });

    if (this.swaggerProps.specification.paths[formatedRoute.swagger]) {
      Object.assign(
        this.swaggerProps.specification.paths[formatedRoute.swagger],
        {
          [route.method.toLowerCase()]: routeConfig,
        }
      );
    } else {
      this.swaggerProps.specification.paths[formatedRoute.swagger] = {
        [route.method.toLowerCase()]: routeConfig,
      };
    }
  }

  setSwaggerProps(props: ISwaggerProps): void {
    Object.assign(this.swaggerProps.layout, props.layout);
    Object.assign(this.swaggerProps.specification, props.specification);
  }

  listen(): boolean {
    if (!this.NODE_ENV)
      return this._showMessage('A propriedade "NODE_ENV" não foi inicializada');
    if (!this.BASE_HOST)
      return this._showMessage(
        'A propriedade "BASE_HOST" não foi inicializada'
      );
    if (!this.PORT)
      return this._showMessage('A propriedade "PORT" não foi inicializada');

    const routeDocs = this.BASE_PATH + "/docs";
    const swaggerSetup = SwaggerUi.setup(
      this.swaggerProps.specification,
      this.swaggerProps.layout
    );

    this.app
      .use(this.BASE_PATH, this.router)
      .use(routeDocs, SwaggerUi.serve, swaggerSetup)
      .listen(this.PORT, () => {
        var _name = `\n ${this.swaggerProps.specification.info.name.toUpperCase()} `;
        var _description = `\n ${this.swaggerProps.specification.info.description} `;

        var _environment = `\n process.env.NODE_ENV: ${this.NODE_ENV} `;
        var _baseRoute = `\n Base Route: http://${this.BASE_HOST}:${this.PORT}${this.BASE_PATH} `;
        var _docsRoute = `\n Docs Route: http://${this.BASE_HOST}:${this.PORT}${this.BASE_PATH}/docs `;

        var message = `\n${_name} ${_description} ${_environment} ${_baseRoute} ${_docsRoute}`;

        console.log(
          color.bgWhite(
            color.black(message.replace(/([^\s][^\n]{1,75})/g, "$1 \n"))
          )
        );
        console.log("");
      });

    return true;
  }

  _formatRoute(route: string): IFormatRoute {
    let pathKeys = route.split("/");

    let formatRoute = new FormatRoute(route);

    if (route.includes(":")) {
      formatRoute.express = route;

      for (let i = 0; i < pathKeys.length; i++) {
        if (pathKeys[i].includes(":"))
          pathKeys[i] = pathKeys[i].replace(":", "{") + "}";
      }

      formatRoute.swagger = pathKeys.join("/");
    } else if (route.includes("{") && route.includes("}")) {
      formatRoute.swagger = route;

      for (let i = 0; i < pathKeys.length; i++) {
        pathKeys[i] = pathKeys[i].replace("{", ":").replace("}", "");
      }

      formatRoute.express = pathKeys.join("/");
    }

    return formatRoute;
  }

  _showMessage(msg: string): boolean {
    console.log("");
    console.log("ExpressSwagger.Server diz: ");
    console.log("");
    console.log(msg);
    console.log("");

    return false;
  }
}

export default {
  AnyObject: AnyObject,
  ServerConfig: ServerConfig,
  Information: Information,
  Layout: Layout,
  Specification: Specification,
  SwaggerProps: SwaggerProps,
  Server: new Server(),
};
