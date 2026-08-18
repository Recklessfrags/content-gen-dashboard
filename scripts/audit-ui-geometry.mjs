export function assertTrackGeometry(trackGeometry) {
  if (trackGeometry.length === 0) {
    throw new Error("run track geometry skipped - unverified: no run track is present");
  }

  const failedGeometry = trackGeometry.find(
    (geometry) => geometry.count !== 11 || !geometry.allVisible,
  );
  if (failedGeometry) {
    throw new Error(
      `run track geometry failed at ${failedGeometry.viewportWidth}px: `
      + `${failedGeometry.count} nodes, bounds ${failedGeometry.minLeft}..${failedGeometry.maxRight}`,
    );
  }
}
