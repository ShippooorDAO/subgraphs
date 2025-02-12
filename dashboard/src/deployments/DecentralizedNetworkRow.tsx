import { useMemo } from "react";
import { latestSchemaVersion } from "../constants";
import { useNavigate } from "react-router";
import { ApolloClient, NormalizedCacheObject, useQuery } from "@apollo/client";
import { toPercent } from "../utils";
import { SubgraphStatusQuery } from "../queries/subgraphStatusQuery";
import { useEffect } from "react";
import { styled } from "../styled";
import { alpha, Card, CircularProgress, TableRow, Typography } from "@mui/material";
import { NetworkLogo } from "../common/NetworkLogo";
import { SubgraphLogo } from "../common/SubgraphLogo";
import { TableCell } from "@mui/material";

const DeploymentBackground = styled("div")`
  background: rgba(22, 24, 29, 0.95);
  border-radius: 8px;
  flex-grow: 2;
`;

const StyledDeployment = styled(Card)<{
  $styleRules: {
    schemaOutdated: boolean;
    nonFatalErrors: boolean;
    fatalError: boolean;
    success: boolean;
    currentVersion: Boolean;
  };
}>(({ $styleRules, theme }) => {
  let statusColor = "";
  if ($styleRules.fatalError) {
    statusColor = theme.palette.error.main;
  } else if ($styleRules.schemaOutdated || $styleRules.nonFatalErrors || !$styleRules.currentVersion) {
    statusColor = theme.palette.warning.main;
  } else if ($styleRules.success) {
    statusColor = theme.palette.success.main;
  } else {
    statusColor = "white";
  }

  const indexedStyles =
    ($styleRules.fatalError || $styleRules.success) &&
    `
    .indexed {
      color: ${statusColor};
    }
  `;
  return `
    background: rgba(22,24,29,0.9);
    background: linear-gradient(0deg, rgba(22,24,29,0.9) 0%, ${statusColor} 95%);
    padding: 1px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    width: 100%;
    justifyContent: space-around;
    &:hover {
      box-shadow: 0 0 2px 1px ${alpha(theme.palette.primary.main, 0.6)};
    }
    
    ${indexedStyles}
  `;
});

interface DecentralizedProps {
  rowData: any;
  subgraphName: string;
  clientIndexing: ApolloClient<NormalizedCacheObject>;
}

// This component is for each individual subgraph
export const DecentralizedNetworkRow = ({ rowData, subgraphName, clientIndexing }: DecentralizedProps) => {
  const navigate = useNavigate();
  const navigateToSubgraph = (url: string) => () => {
    navigate(`subgraph?endpoint=${url}&tab=protocol`);
  };
  // Pull the subgraph name to use as the variable input for the indexing status query
  const deploymentId = rowData.deploymentId;
  const {
    data: status,
    error: errorIndexing,
    loading: statusLoading,
  } = useQuery(SubgraphStatusQuery(""), {
    variables: { subgraphName, deploymentIds: [deploymentId ? deploymentId : ""] },
    client: clientIndexing,
  });
  let statusData = status?.indexingStatusForCurrentVersion;

  let { nonFatalErrors, fatalError, synced } = statusData ?? {};
  if (status?.indexingStatuses) {
    statusData = status?.indexingStatuses[0];
    synced = statusData?.synced ?? null;
    fatalError = statusData?.fatalError ?? null;
    nonFatalErrors = statusData?.nonFatalErrors ?? [];
  }

  const schemaVersion = rowData?.schemaVersion;

  useEffect(() => {
    if (errorIndexing) {
      console.log(rowData, "DEPLOYMENT ERR", errorIndexing, status, statusData, subgraphName);
    }
  }, [errorIndexing]);

  const { schemaOutdated, indexedSuccess } = useMemo(() => {
    return {
      schemaOutdated: schemaVersion && schemaVersion !== latestSchemaVersion,
      indexedSuccess: synced && schemaVersion === latestSchemaVersion,
    };
  }, [schemaVersion, fatalError, synced]);
  if (statusLoading) {
    return (
      <div style={{ display: "inline-block", width: "100%" }}>
        <CircularProgress sx={{ margin: "10px" }} size={"33px"} />
      </div>
    );
  }

  if (!statusData && !statusLoading) {
    return null;
  }

  let statusColor = "";
  if (fatalError) {
    statusColor = "#B8301C";
  } else if (schemaOutdated || nonFatalErrors?.length > 0) {
    statusColor = "#EFCB68";
  } else if (indexedSuccess) {
    statusColor = "#58BC82";
  }

  const indexed = synced
    ? 100
    : toPercent(statusData?.chains[0]?.latestBlock?.number || 0, statusData?.chains[0]?.chainHeadBlock?.number);

  let network = rowData.network;
  if (network === "mainnet") {
    network = "ethereum";
  }
  if (network === "matic") {
    network = "polygon";
  }

  const endpointURL =
    "https://gateway.thegraph.com/api/f57ab6e6638dd854bc032b4c9a10ee1e/subgraphs/id/" + rowData.subgraphId;
  return (
    <TableRow sx={{ width: "100%", backgroundColor: "rgba(22,24,29,0.9)" }} onClick={navigateToSubgraph(endpointURL)}>
      <TableCell
        sx={{ padding: "6px", borderLeft: `${statusColor} solid 6px`, verticalAlign: "middle", display: "flex" }}
      >
        <SubgraphLogo name={subgraphName} />
        <NetworkLogo network={network} />
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "6px", fontSize: "14px" }}>
          {subgraphName}-{network}
        </span>
      </TableCell>
      <TableCell sx={{ padding: "6px", textAlign: "right" }}>
        <Typography variant="h5" sx={{ width: "100%" }} fontSize={14}>
          {Number(indexed) ? indexed + "%" : "N/A"}
        </Typography>
      </TableCell>
      <TableCell sx={{ padding: "6px", textAlign: "right" }}>
        <Typography variant="h5" sx={{ width: "100%" }} fontSize={14}>
          {Number(statusData?.chains[0]?.latestBlock?.number)?.toLocaleString() || 0}
        </Typography>
      </TableCell>
      <TableCell sx={{ padding: "6px", textAlign: "right" }}>
        <Typography variant="h5" sx={{ width: "100%" }} fontSize={14}>
          {Number(statusData?.chains[0]?.chainHeadBlock?.number)?.toLocaleString() || "?"}
        </Typography>
      </TableCell>
      <TableCell sx={{ padding: "6px", textAlign: "right" }}>
        <Typography variant="h5" sx={{ width: "100%" }} fontSize={14}>
          {rowData?.schemaVersion || "N/A"}
        </Typography>
      </TableCell>
      <TableCell sx={{ padding: "6px", textAlign: "right" }}>
        <Typography variant="h5" sx={{ width: "100%" }} fontSize={14}>
          {rowData?.subgraphVersion || "N/A"}
        </Typography>
      </TableCell>
      <TableCell sx={{ padding: "6px", textAlign: "right" }}>
        <Typography variant="h5" sx={{ width: "100%" }} fontSize={14}>
          {nonFatalErrors?.length || 0}
        </Typography>
      </TableCell>
      <TableCell sx={{ padding: "6px", textAlign: "right", paddingRight: "30px" }}>
        <Typography variant="h5" sx={{ width: "100%" }} fontSize={14}>
          {parseInt(statusData?.entityCount) ? parseInt(statusData?.entityCount)?.toLocaleString() : "N/A"}
        </Typography>
      </TableCell>
    </TableRow>
  );
};
