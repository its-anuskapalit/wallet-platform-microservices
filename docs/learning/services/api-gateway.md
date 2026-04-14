# ApiGateway (Ocelot) cheat sheet

- **Port:** 5000  
- **Role:** Reverse proxy + CORS for Angular dev (`http://localhost:4200`)  
- **Config:** [`ocelot.json`](../../../src/Gateway/ApiGateway/ocelot.json), [`Program.cs`](../../../src/Gateway/ApiGateway/Program.cs)  
- **Database / events:** None  
- **Notes:** Downstream URLs use `localhost` and fixed ports; Docker or Kubernetes deployments need matching host/port configuration.
