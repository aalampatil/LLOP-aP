Build a full-stack platform where users can create polls, share them through a public link and collect feedback from others.

A logged-in user should be able to create a poll, add multiple questions, mark questions as mandatory or optional and decide whether responses should be anonymous or authenticated. Each poll link should also support an expiry time, after which the poll automatically becomes inactive and no further responses should be accepted.

For this hackathon, questions will support single option selection only, where respondents can choose one answer from the available options.

Respondents should be able to open the shared poll link, answer the questions and submit their feedback smoothly.

After responses are submitted, the poll creator should have access to a clear analytics dashboard showing total responses, question-wise summaries, option counts and overall participation insights.

Once a poll is completed, the creator should also be able to publish the final results. After publishing, anyone visiting the same poll link should be able to view the final poll outcome and response summaries.

You will apply concepts like authentication, protected routes, public forms, dynamic React forms, validation, database schema design, Express APIs, response collection, analytics handling and real-time updates using WebSockets / Socket.io for live response counts and analytics updates.

Rules & Guidelines
Polls should support single option based questions where respondents can choose one answer from the available options.

Polls must support both anonymous and authenticated response modes.

Each poll link must have an expiry system after which responses should no longer be accepted.

Mandatory and optional question validation must be handled properly on both backend and frontend.

Poll creators must have a proper analytics dashboard showing responses, summaries, option counts and participation insights.

Poll creators should be able to publish final poll results so they can be viewed publicly through the same poll link after completion.

Real-time updates using WebSockets / Socket.io should be implemented for live response count and analytics updates.

Frontend and backend both are mandatory. Only API implementations without UI will not be considered complete submissions.

Final submission must include a public GitHub repository, deployed project link and proper README.

Both backend and frontend code must be maintained inside one single GitHub repository only.
