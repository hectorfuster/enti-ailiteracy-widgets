module.exports = async function globalSetup() {
  const { startStaticServer } = await import("./scripts/static-server.mjs");
  const server = await startStaticServer();

  return async () => {
    await new Promise((resolve) => {
      server.close(resolve);
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
    });
  };
};
