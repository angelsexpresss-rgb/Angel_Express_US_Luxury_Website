import { router } from "expo-router";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CheckCircle2, Gift, Home, Ticket } from "lucide-react-native";

const GOLD = "#D4AF37";

export default function ModalScreen() {
  return (
    <ImageBackground
      source={require("../assets/images/dashboard-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={styles.iconCircle}>
            <CheckCircle2 size={60} color={GOLD} />
          </View>

          <Text style={styles.title}>
            Angel Express
          </Text>

          <Text style={styles.subtitle}>
            Operation Completed Successfully
          </Text>

          <Text style={styles.description}>
            Your request has been processed successfully.
            Continue exploring Angel Express.
          </Text>

          <TouchableOpacity
            style={styles.goldButton}
            onPress={() => router.replace("/dashboard" as any)}
          >
            <Home color="#071426" size={22} />
            <Text style={styles.goldButtonText}>
              Go To Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push("/book-ride" as any)}
          >
            <Ticket color={GOLD} size={22} />
            <Text style={styles.outlineButtonText}>
              Book Another Ride
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push("/rewards" as any)}
          >
            <Gift color={GOLD} size={22} />
            <Text style={styles.outlineButtonText}>
              View Rewards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
          >
            <Text style={styles.closeText}>
              Close
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  background:{
    flex:1,
  },

  overlay:{
    flex:1,
    backgroundColor:"rgba(4,12,24,.88)",
    justifyContent:"center",
    alignItems:"center",
    padding:24,
  },

  card:{
    width:"100%",
    backgroundColor:"#071426",
    borderRadius:30,
    borderWidth:1,
    borderColor:"rgba(212,175,55,.22)",
    padding:28,
    alignItems:"center",
  },

  iconCircle:{
    width:90,
    height:90,
    borderRadius:45,
    backgroundColor:"rgba(212,175,55,.12)",
    justifyContent:"center",
    alignItems:"center",
    marginBottom:24,
  },

  title:{
    color:GOLD,
    fontSize:34,
    fontWeight:"900",
  },

  subtitle:{
    color:"#FFFFFF",
    fontSize:22,
    fontWeight:"800",
    marginTop:10,
  },

  description:{
    color:"#B9C5D3",
    fontSize:16,
    textAlign:"center",
    lineHeight:25,
    marginTop:18,
    marginBottom:30,
  },

  goldButton:{
    width:"100%",
    height:60,
    backgroundColor:GOLD,
    borderRadius:18,
    justifyContent:"center",
    alignItems:"center",
    flexDirection:"row",
    marginBottom:14,
  },

  goldButtonText:{
    color:"#071426",
    fontSize:18,
    fontWeight:"900",
    marginLeft:10,
  },

  outlineButton:{
    width:"100%",
    height:58,
    borderRadius:18,
    borderWidth:1,
    borderColor:"rgba(212,175,55,.25)",
    justifyContent:"center",
    alignItems:"center",
    flexDirection:"row",
    marginBottom:14,
  },

  outlineButtonText:{
    color:GOLD,
    fontSize:17,
    fontWeight:"800",
    marginLeft:10,
  },

  closeText:{
    color:"#9CA9B8",
    fontSize:16,
    marginTop:10,
    fontWeight:"700",
  },

});