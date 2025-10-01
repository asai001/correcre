import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#00A7C2", contrastText: "#fff" },
  },
  shape: { borderRadius: 3 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontSize: 16 },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});
