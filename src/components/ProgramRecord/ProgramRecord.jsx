import React, { useState, useEffect } from 'react';
import { sendTrackEvent } from '@edx/frontend-platform/analytics';

import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';

import {
  Info, ChevronLeft,
} from '@openedx/paragon/icons';
import {
  Alert, Container, Hyperlink,
} from '@openedx/paragon';

import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { logError } from '@edx/frontend-platform/logging';
import isEmpty from 'lodash/isEmpty';

import ProgramRecordActions from './ProgramRecordActions';
import ProgramRecordHeader from './ProgramRecordHeader';
import ProgramRecordTable from './ProgramRecordTable';
import RecordsHelp from './RecordsHelp';
import ProgramRecordAlert from '../ProgramRecordAlert';
import SendLearnerRecordModal from '../ProgramRecordSendModal';
import createCorrectInternalRoute from '../../utils';

import { getProgramDetails } from './data/service';

function ProgramRecord({ isPublic }) {
  const [recordDetails, setRecordDetails] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasNoData, setHasNoData] = useState(false);
  const [showSendRecordButton, setShowSendRecordButton] = useState(false);

  const [showProgramRecord429Error, setShowProgramRecord429Error] = useState(false);

  const [sendRecord, setSendRecord] = useState({
    sendRecordModalOpen: false,
    sendRecordSuccessPathways: [],
    sendRecordFailurePathways: [],
  });

  const { programUUID } = useParams();

  useEffect(() => {
    getProgramDetails(programUUID, isPublic).then((data) => {
      if (isEmpty(data)) {
        setHasNoData(true);
      } else {
        setRecordDetails(data);
        setShowSendRecordButton(data.record.pathways.length > 0);
      }
      setIsLoaded(true);
    }).catch((error) => {
      const errorMessage = (`Error: Could not fetch program record data for user: ${error.message}`);
      logError(errorMessage);
    });
  }, [programUUID, isPublic]);

  const toggleSendRecordModal = () => {
    if (!sendRecord.sendRecordModalOpen) {
      sendTrackEvent('edx.bi.credentials.program_record.send_started', {
        category: 'records',
        'program-uuid': programUUID,
      });
    }
    setSendRecord(prev => ({
      ...prev,
      sendRecordModalOpen: !prev.sendRecordModalOpen,
    }));
  };

  const onCloseSuccessAndFailureAlert = (id) => {
    setSendRecord(prev => ({
      ...prev,
      sendRecordSuccessPathways: prev.sendRecordSuccessPathways.filter(pathway => pathway.id !== id),
      sendRecordFailurePathways: prev.sendRecordFailurePathways.filter(pathway => pathway.id !== id),
    }));
  };

  const renderBackButton = () => (
    <Hyperlink
      destination={createCorrectInternalRoute('/')}
      variant="muted"
    >
      <ChevronLeft />
      <FormattedMessage
        id="link.back.to.records"
        defaultMessage="Back to My Records"
        description="A link that takes the user back to their program records"
      />
    </Hyperlink>
  );

  const renderProgramDetails = () => (
    <>
      <ProgramRecordActions
        showSendRecordButton={showSendRecordButton}
        isPublic={isPublic}
        toggleSendRecordModal={toggleSendRecordModal}
        renderBackButton={renderBackButton}
        username={recordDetails.record.learner.username}
        programUUID={programUUID}
        sharedRecordUUID={recordDetails.record.shared_program_record_uuid}
        setShowProgramRecord429Error={setShowProgramRecord429Error}
      />
      {sendRecord.sendRecordSuccessPathways && sendRecord.sendRecordSuccessPathways.map(pathway => (
        <ProgramRecordAlert
          key={pathway.id}
          alertType="success"
          onClose={onCloseSuccessAndFailureAlert}
          creditPathway={pathway}
          setSendRecord={setSendRecord}
          programUUID={programUUID}
          username={recordDetails.record.learner.username}
          platform={recordDetails.record.platform_name}
        />
      ))}
      {showProgramRecord429Error && (
        <ProgramRecordAlert
          alertType="429"
          setShowProgramRecord429Error={setShowProgramRecord429Error}
        />
      )}
      {sendRecord.sendRecordFailurePathways && sendRecord.sendRecordFailurePathways.map(pathway => (
        <ProgramRecordAlert
          key={pathway.id}
          alertType="failure"
          onClose={onCloseSuccessAndFailureAlert}
          creditPathway={pathway}
          setSendRecord={setSendRecord}
          programUUID={programUUID}
          username={recordDetails.record.learner.username}
          platform={recordDetails.record.platform_name}
          setShowProgramRecord429Error={setShowProgramRecord429Error}
        />
      ))}
      <article className="program-record my-4.5">
        <ProgramRecordHeader
          learner={recordDetails.record.learner}
          program={recordDetails.record.program}
          platform={recordDetails.record.platform_name}
        />
        <section className="program-record-grades">
          <ProgramRecordTable
            grades={recordDetails.record.grades}
          />
        </section>
      </article>

      {recordDetails.records_help_url && (
      <RecordsHelp
        helpUrl={recordDetails.records_help_url}
      />
      )}
      {sendRecord.sendRecordModalOpen && (
      <SendLearnerRecordModal
        isOpen={sendRecord.sendRecordModalOpen}
        toggleSendRecordModal={toggleSendRecordModal}
        creditPathways={recordDetails.record.pathways}
        programUUID={programUUID}
        username={recordDetails.record.learner.username}
        setSendRecord={setSendRecord}
        platform={recordDetails.record.platform_name}
        programType={recordDetails.record.program.type_name}
        setShowProgramRecord429Error={setShowProgramRecord429Error}
      />
      )}
    </>
  );

  const renderCredentialsServiceIssueAlert = () => (
    <div tabIndex="-1">
      {renderBackButton()}
      <Alert variant="danger">
        <Info className="text-danger-500 mr-2 mb-1" />
        <FormattedMessage
          id="records.list.error"
          defaultMessage="An error occurred attempting to retrieve your program records. Please try again later."
          description="An error message indicating there is a problem retrieving the user's program records"
        />
      </Alert>
    </div>
  );

  const renderLoading = () => (
    <>
      {!isPublic && renderBackButton()}
      <p>
        <FormattedMessage
          id="page.loading.message"
          defaultMessage="Loading..."
          description="Loading message when a program record is fetching data."
        />
      </p>
    </>
  );

  const renderData = () => {
    if (isLoaded) {
      if (hasNoData) {
        return renderCredentialsServiceIssueAlert();
      }
      return renderProgramDetails();
    }
    return renderLoading();
  };

  return (
    <Container size="lg" className="program-record-wrapper">
      {renderData()}
    </Container>
  );
}

ProgramRecord.propTypes = {
  isPublic: PropTypes.bool.isRequired,
};

export default ProgramRecord;
