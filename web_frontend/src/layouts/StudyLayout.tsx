import {
  Flex,
  Container,
  ContainerProps,
  FlexProps,
  createPolymorphicComponent,
  createStyles,
  Box,
  Image,
  Stack,
  Button,
  Group,
} from "@mantine/core";
import { motion } from "framer-motion";
import { GAP_VH } from "../components/CardWrapper";
import ExplorePane from "../components/ExplorePane";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import axiosClient from "../axiosConfig";
import {
  entitiesState,
  googleSearchResultUrlAtom,
  isExplicitListeningState,
  studyConditionAtom,
  videoTimeAtom,
} from "../recoil";
import { useEffect, useRef, useState } from "react";
import CardScrollArea from "../components/CardScrollArea";
import { VIDEO_SRC } from "../constants";
import { LOAD_RECORDING_ENDPOINT } from "../serverEndpoints";
import { StudyCondition } from "../types";
import ChatGPT from "../components/ChatGPT";

// animate-able components for framer-motion
// https://github.com/orgs/mantinedev/discussions/1169#discussioncomment-5444975
const PFlex = createPolymorphicComponent<"div", FlexProps>(Flex);
const PContainer = createPolymorphicComponent<"div", ContainerProps>(Container);

const useStyles = createStyles({
  root: {
    height: "100vh",
    width: "100vw",
    background:
      "var(--bg-gradient-full---blue, linear-gradient(180deg, #191A27 2.23%, #14141D 25.74%, #14141D 49.42%, #14141D 73.62%, #14141D 96.28%))",
    overflow: "clip",
  },

  container: {
    width: "100%",
    height: "100%",
    padding: 0,
    flex: "1 1 0",
  },
});

// Get the recording from the backend and store the prerecorded entities in `results`
let results: any[] = [];

const getRecordingFromPublicFolder = async (videoId: string) => {
  console.log(`Fetching this: /${videoId}.json`);
  try {
    const response = await fetch(`/${videoId}.json`);
    const jsonData = await response.json();
    console.error("got that stuff in getRecordingFromPublicFolder()");
    results = jsonData;
    return true; // Return true if fetch is successful
  } catch (error) {
    console.error("Error fetching the JSON file:", error);
    return false; // Return false in case of an error
  }
};

const getRecordingFromBackend = (videoId: string) => {
  if (!videoId) return;

  const payload = {
    recordingName: videoId,
  };

  axiosClient
    .post(LOAD_RECORDING_ENDPOINT, payload)
    .then((res: any) => {
      results = res.data;
    })
    .catch(function (error: any) {
      console.error(error);
    });
};

const videoName = VIDEO_SRC.substring(0, VIDEO_SRC.indexOf("."));
console.log(videoName);
getRecordingFromPublicFolder(videoName).then((success) => {
  if (!success) {
    getRecordingFromBackend(videoName);
  }
});

let resultDisplayIndex = 0;
const StudyLayout = () => {
  const { classes } = useStyles();

  const entities = useRecoilValue(entitiesState);
  const setEntities = useSetRecoilState(entitiesState);
  const isExplicitListening = useRecoilValue(isExplicitListeningState);
  const [time, setTime] = useRecoilState(videoTimeAtom);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (results.length == 0) return;
    if (resultDisplayIndex >= results.length) return;

    if (
      time !== undefined &&
      time > results[resultDisplayIndex]["time_since_recording_start"]
    ) {
      setEntities((entities: any) =>
        [...entities, results[resultDisplayIndex]].filter((e) => {
          return !(e == null || e == undefined);
        })
      );
      resultDisplayIndex += 1;
    }
    return () => {};
  }, [time]);

  const [hasVideoEnded, setHasVideoEnded] = useState(false);
  const [userInteractions, setUserInteractions] = useState(0);
  const studyCondition = useRecoilValue(studyConditionAtom);
  const setGoogleSearchResultUrl = useSetRecoilState(googleSearchResultUrlAtom);

  /*
  useEffect(() => {
        const timer = setTimeout(() => {
            // Your function logic here
            videoRef.current?.play();
        }, 5 * 1000); // n is the delay in milliseconds (1000 ms = 1 second)

        return () => clearTimeout(timer); // Cleanup timer
    }, []); // Empty dependency array means this runs once after the initial render
   */

  useEffect(() => {
    if (studyCondition === StudyCondition.GOOGLE) {
      // insert the Programmable Search Engine script into the DOM
      const script = document.createElement("script");
      document.head.append(script);
      //script.src = "https://cse.google.com/cse.js?cx=c6140097ef66f4f84";
      script.src = "https://cse.google.com/cse.js?cx=5670fc00c6f414e7a";

      const resultsRenderedCallback = () => {
        // get all the search results
        document.querySelectorAll("a.gs-title, a.gs-image").forEach((element) =>
          element.addEventListener("click", (event) => {
            // don't open the link; instead, display it in the explore pane
            event.preventDefault();

            //show iframe
            const iframe = document.getElementById('overlay-iframe');
            iframe.style.display = 'block'; // Show the iframe
            iframe.src = element.getAttribute("data-ctorig") ?? 'about:blank'; // Set the URL
            const back_button = document.getElementById('overlay-back');
            back_button.style.display = 'block'; // Show the button
                                                                                   //
            setGoogleSearchResultUrl(
              element.getAttribute("data-ctorig") ?? undefined
            );
            
            setUserInteractions(prevCount => prevCount + 1); // Increment user interactions
          })
        );

        // get when search button is clicked
        // Attach an event listener to the 'gsc-search-button' click event
        document.querySelector('.gsc-search-button').addEventListener('click', () => {
            //hide iframe
            const iframe = document.getElementById('overlay-iframe');
            iframe.style.display = 'none'; // Hide the iframe
            const back_button = document.getElementById('overlay-back');
            back_button.style.display = 'none'; // Show the button
            
            setUserInteractions(prevCount => prevCount + 1); // Increment user interactions
        });

        // Attach an event listener to the search input field for the 'Enter' key press
        document.querySelector('.gsc-input').addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                // Prevent the default form submission if your search input is inside a form
                event.preventDefault();

                // Trigger the same actions as the search button click
                // You might need to trigger the click event of the actual search button or replicate the logic here
                document.querySelector('.gsc-search-button').click();
            }
        });

      };

      // Use the Programmable Search Engine API to run the callback whenever results render
      // https://developers.google.com/custom-search/docs/element
      const windowUnsafeTyped = window as unknown as {
        __gcse: { searchCallbacks?: unknown };
      };
      windowUnsafeTyped.__gcse || (windowUnsafeTyped.__gcse = {});
      windowUnsafeTyped.__gcse.searchCallbacks = {
        web: {
          rendered: resultsRenderedCallback,
        },
      };
    }
  }, [setGoogleSearchResultUrl, studyCondition]);

  return (
    <>
      <PFlex component={motion.div} className={classes.root} layout data-user-interactions={userInteractions}>
        <PContainer
          component={motion.div}
          layout
          fluid
          w={"68%"}
          justify-content={"center"}
          sx={{
            flex: "none",
          }}
          className={classes.container}
        >
          <Stack
            sx={{
              height: "100%",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              padding: "15px",
            }}
          >
            <Stack justify-content="center" align="center">
              <Group>
                <Button
                  onClick={() => videoRef.current?.play()}
                  variant="default"
                  fullWidth
                  disabled={hasVideoEnded}
                >
                  {hasVideoEnded
                    ? "Video ended"
                    : time === undefined
                    ? "Start"
                    : `Please watch until end of video.`}
                </Button>
              </Group>
              <video
                src={VIDEO_SRC}
                style={{ width: "67vw", height: "auto" }} // Adjust the value as needed
                ref={videoRef}
                onTimeUpdate={() => setTime(videoRef.current?.currentTime)}
                onEnded={() => setHasVideoEnded(true)}
              ></video>
            </Stack>
            {/*(studyCondition === StudyCondition.GOOGLE) && (
              <ExplorePane
                loading={loadingViewMore}
                setLoading={setLoadingViewMore}
              />
            )*/}
          </Stack>
        </PContainer>
        <PContainer
          component={motion.div}
          layout
          fluid
          className={classes.container}
          w={"32%"}
          pt={studyCondition !== StudyCondition.GOOGLE ? `${GAP_VH}vh` : "0"}
          px={"1rem"}
          transition={{ bounce: 0 }}
        >
          {/* Left Panel */}
          {studyCondition === StudyCondition.CONVOSCOPE && (
            <>
              {entities.length === 0 && !isExplicitListening && (
                <Box w="32%" mx="auto" mt="xl">
                  <Image src={"/blobs.gif"} fit="cover" />
                </Box>
              )}
              <CardScrollArea />
            </>
          )}
          {studyCondition === StudyCondition.GOOGLE && (
            <Box
              sx={{
                ".gsc-input": { color: "black" },
                ".gsc-control-cse": { height: "100%" },
                ".gsc-control-wrapper-cse": {
                  height: "100%",
                  overflow: "auto",
                },
                "#___gcse_1": { height: "100%" },
                height: "100%",
                // Removed position relative here as it will be applied to the new container
              }}
            > 
              <div className="gcse-searchbox"></div>
              
              {/* New container for search results and iframe */}
              <div style={{ position: 'relative', height: '100%' }}>
                <div className="gcse-searchresults"></div>

                {/* Iframe Overlay */}
                <iframe
                  src=""
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%', 
                    height: '100%',
                    border: 'none',
                    display: 'none', // Initially hide the iframe
                    zIndex: 10, // Ensure the iframe is above other content
                  }}
                  id="overlay-iframe"
                  className="overlay-iframe"
                  sandbox=""
                ></iframe>

                  <button
                    id="overlay-back"
                    onClick={() => {
                      document.getElementById('overlay-iframe').style.display = 'none'; // Hide the iframe
                      document.getElementById('overlay-back').style.display = 'none'; // Hide the iframe
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px', // Adjust as needed
                      left: '10px', // Adjust as needed
                      zIndex: 11, // Ensure the button is above the iframe
                      display: 'none', // Initially hide the iframe
                      // Add more styles as needed for the button appearance
                    }}
                  >
                    Back
                  </button>
              </div>
            </Box>
          )}
          {studyCondition === StudyCondition.CHATGPT && <ChatGPT />}
        </PContainer>
      </PFlex>
    </>
  );
};

export default StudyLayout;