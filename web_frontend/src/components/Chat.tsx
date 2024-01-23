import {
  ActionIcon,
  Box,
  Flex,
  ScrollArea,
  Textarea,
  Text,
  Stack,
  Button,
  Group,
} from "@mantine/core";
import {
  IconArrowUp,
  IconFile,
  IconFlower,
  IconShare,
  IconUser,
} from "@tabler/icons-react";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import axiosClient from "../axiosConfig";
import { SEND_AGENT_CHAT_ENDPOINT } from "../serverEndpoints";
import { explicitInsightsState, isExplicitListeningState } from "../recoil";
import { useRecoilValue } from "recoil";

enum Sender {
  MIRA = "Mira",
  USER = "You",
}

interface Message {
  sender: Sender;
  content: string;
}

const Chat = () => {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [isMiraLoading, setIsMiraLoading] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const explicitInsights = useRecoilValue(explicitInsightsState);
  const lastInsight = explicitInsights.at(-1);
  const isExplicitListening = useRecoilValue(isExplicitListeningState);

  const handleSendMessage = () => {
    if (query.trim()) {
      const payload = {
        agent_name: "agent_name",
        userId: window.userId,
        deviceId: window.deviceId,
        chatMessage: query,
      };
      axiosClient.post(SEND_AGENT_CHAT_ENDPOINT, payload);

      setQuery("");
      setIsMiraLoading(true);
    }
  };

  useEffect(() => {
    if (isExplicitListening) {
      setIsUserLoading(true);
    }
  }, [isExplicitListening]);

  useEffect(() => {
    if (lastInsight?.insight) {
      setHistory((prevHistory) => [
        ...prevHistory,
        {
          sender: Sender.MIRA,
          content: lastInsight.insight!,
        },
      ]);

      setIsMiraLoading(false);
    } else if (lastInsight?.query) {
      setHistory((prevHistory) => [
        ...prevHistory,
        {
          sender: Sender.USER,
          content: lastInsight.query!,
        },
      ]);

      setIsUserLoading(false);
      setIsMiraLoading(true);
    }
  }, [lastInsight?.insight, lastInsight?.query]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      // scroll to bottom of the scroll area
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [history]);

  return (
    <Flex h="100%" p="md" bg="rgb(52,53,65)" direction="column">
      {history.length === 0 && !isUserLoading && !isMiraLoading && (
        <Stack m="auto">
          <Box w="3rem" h="3rem" m="auto">
            <IconUser
              color="white"
              size="3rem"
              style={{
                margin: "auto",
                background: "#acacbe",
                padding: "0.5rem",
                borderRadius: 100,
              }}
            />
          </Box>
          <Text fw="bolder" color="white" w="fit-content" m="auto" size="xl">
            Ask Mira
          </Text>
        </Stack>
      )}
      <ScrollArea viewportRef={scrollAreaRef}>
        {history.map((message, i) => (
          <MessageDisplay sender={message.sender} key={`message-${i}`}>
            {message.content.split("\n").map((p, j) => (
              <Text pb="xs" key={`message-text-${j}`}>
                {p}
              </Text>
            ))}
          </MessageDisplay>
        ))}
        {isMiraLoading && (
          <MessageDisplay sender={Sender.MIRA}>
            <Text pb="xs">
              <LoadingDots />
            </Text>
          </MessageDisplay>
        )}
        {isUserLoading && (
          <MessageDisplay sender={Sender.USER}>
            <Text pb="xs">
              <LoadingDots />
            </Text>
          </MessageDisplay>
        )}
      </ScrollArea>
      <Group py="xs" mt="auto">
        <Button
          variant="default"
          size="md"
          sx={{ flex: "1 1 0" }}
          rightIcon={<IconFile />}
        >
          Summarize
        </Button>
        <Button
          variant="default"
          size="md"
          sx={{ flex: "1 1 0" }}
          rightIcon={<IconShare />}
        >
          Share
        </Button>
      </Group>
      <Flex
        direction="row"
        gap="xs"
        w="100%"
        p="xs"
        h="min-content"
        sx={{
          borderRadius: "0.25rem",
          outline: "1px solid #8e8ea0",
          background: "rgba(0,0,0,0)",
        }}
      >
        <Textarea
          value={query}
          autosize
          maxRows={8}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              handleSendMessage();
            }
          }}
          w="100%"
          placeholder="Message Mira..."
          my="auto"
          sx={{
            height: "min-content",
            textarea: {
              padding: 0,
              border: "none",
              background: "rgba(0,0,0,0)",
              minHeight: "unset",
            },
          }}
        />
        <ActionIcon
          variant="filled"
          size="lg"
          mt="auto"
          bg="black"
          onClick={handleSendMessage}
        >
          <IconArrowUp size="1.125rem" />
        </ActionIcon>
      </Flex>
    </Flex>
  );
};

export default Chat;

const MessageDisplay = ({
  sender,
  children,
}: PropsWithChildren<{ sender: Sender }>) => {
  return (
    <Flex>
      <Box w="1.5rem" h="1.5rem" mr="xs">
        {sender === Sender.MIRA ? (
          <IconFlower
            color="white"
            size="1.5rem"
            style={{
              margin: "auto",
              background: "#19c37d",
              padding: "0.25rem",
              borderRadius: 100,
            }}
          />
        ) : (
          <IconUser
            color="white"
            size="1.5rem"
            style={{
              margin: "auto",
              background: "#acacbe",
              padding: "0.25rem",
              borderRadius: 100,
            }}
          />
        )}
      </Box>
      <Flex direction="column" pb="xl">
        <Text fw="bold">{sender}</Text>
        {children}
      </Flex>
    </Flex>
  );
};

const LoadingDots = () => {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (dots.length < 3) {
        setDots(dots + ".");
      } else {
        setDots(".");
      }
    }, 500);
    return () => clearInterval(intervalId);
  }, [dots]);

  return <span>{dots}</span>;
};
