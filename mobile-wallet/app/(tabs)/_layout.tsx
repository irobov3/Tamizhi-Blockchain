import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function WalletTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#d4a017",
        tabBarInactiveTintColor: "#8a8aa0",
        tabBarStyle: {
          backgroundColor: "#0e0824",
          borderTopColor: "#1a1040",
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="arrow-up-bold-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: "Receive",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="arrow-down-bold-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stake"
        options={{
          title: "Stake",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="finance" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
      {/* Hide stale messenger routes inherited from template */}
      <Tabs.Screen name="chats" options={{ href: null }} />
      <Tabs.Screen name="contacts" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
    </Tabs>
  );
}
