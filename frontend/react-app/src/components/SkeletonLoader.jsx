import React from 'react';
import { Card, Row, Col, Container } from 'react-bootstrap';
import './SkeletonLoader.css';

/**
 * Skeleton loader for class cards
 */
export const ClassCardSkeleton = ({ count = 3 }) => {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <Col key={index} xs={12} md={6} lg={4} className="mb-4">
          <Card className="skeleton-card">
            <Card.Body>
              <div className="skeleton skeleton-title mb-3"></div>
              <div className="skeleton skeleton-text mb-2"></div>
              <div className="skeleton skeleton-text mb-2" style={{ width: '80%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
              <div className="d-flex justify-content-between mt-3">
                <div className="skeleton skeleton-button"></div>
                <div className="skeleton skeleton-button"></div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </>
  );
};

/**
 * Skeleton loader for material/exam lists
 */
export const ListItemSkeleton = ({ count = 5 }) => {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="skeleton-list-item mb-3">
          <div className="d-flex align-items-center">
            <div className="skeleton skeleton-icon me-3"></div>
            <div className="flex-grow-1">
              <div className="skeleton skeleton-text mb-2" style={{ width: '70%' }}></div>
              <div className="skeleton skeleton-text-sm" style={{ width: '40%' }}></div>
            </div>
            <div className="skeleton skeleton-badge"></div>
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Skeleton loader for profile section
 */
export const ProfileSkeleton = () => {
  return (
    <Card className="skeleton-card">
      <Card.Body>
        <div className="text-center">
          <div className="skeleton skeleton-avatar mx-auto mb-3"></div>
          <div className="skeleton skeleton-title mb-2 mx-auto" style={{ width: '60%' }}></div>
          <div className="skeleton skeleton-text mb-2 mx-auto" style={{ width: '40%' }}></div>
          <div className="skeleton skeleton-text mx-auto" style={{ width: '50%' }}></div>
        </div>
        <hr />
        <div className="skeleton skeleton-text mb-2"></div>
        <div className="skeleton skeleton-text mb-2"></div>
        <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
      </Card.Body>
    </Card>
  );
};

/**
 * Skeleton loader for table rows
 */
export const TableRowSkeleton = ({ columns = 4, rows = 5 }) => {
  return (
    <>
      {[...Array(rows)].map((_, rowIndex) => (
        <tr key={rowIndex}>
          {[...Array(columns)].map((_, colIndex) => (
            <td key={colIndex}>
              <div className="skeleton skeleton-text"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

/**
 * Skeleton loader for stats/metrics cards
 */
export const StatsCardSkeleton = ({ count = 4 }) => {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <Col key={index} xs={6} md={3} className="mb-3">
          <Card className="skeleton-card text-center">
            <Card.Body>
              <div className="skeleton skeleton-number mx-auto mb-2"></div>
              <div className="skeleton skeleton-text-sm mx-auto" style={{ width: '70%' }}></div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </>
  );
};

/**
 * Skeleton loader for dashboard page
 */
export const DashboardSkeleton = () => {
  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <div className="skeleton skeleton-heading mb-4"></div>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <StatsCardSkeleton count={4} />
      </Row>
      
      <Row>
        <ClassCardSkeleton count={6} />
      </Row>
    </Container>
  );
};

/**
 * Skeleton loader for exam/material details
 */
export const DetailsSkeleton = () => {
  return (
    <Card className="skeleton-card">
      <Card.Header>
        <div className="skeleton skeleton-title"></div>
      </Card.Header>
      <Card.Body>
        <div className="skeleton skeleton-text mb-3"></div>
        <div className="skeleton skeleton-text mb-3"></div>
        <div className="skeleton skeleton-text mb-3" style={{ width: '90%' }}></div>
        <div className="skeleton skeleton-text mb-3" style={{ width: '85%' }}></div>
        <hr />
        <Row>
          <Col md={6}>
            <div className="skeleton skeleton-text mb-2"></div>
            <div className="skeleton skeleton-text"></div>
          </Col>
          <Col md={6}>
            <div className="skeleton skeleton-text mb-2"></div>
            <div className="skeleton skeleton-text"></div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default {
  ClassCardSkeleton,
  ListItemSkeleton,
  ProfileSkeleton,
  TableRowSkeleton,
  StatsCardSkeleton,
  DashboardSkeleton,
  DetailsSkeleton
};
